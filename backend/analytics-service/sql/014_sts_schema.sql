-- =============================================================================
-- Schema `sts`: copy of STS FDS (Fraud Detection System) fraud-score data.
-- Target DB: fraud_demo. NOT managed by Flyway (run directly, like the other
-- files in this folder). Objects are owned by fraud_app.
--
-- Source: Elasticsearch index `<env>_fds_fraud_score` (e.g. dev_1_fds_fraud_score).
-- One ES document = one fraud score for one transaction:
--   doc (fraud score header)          -> sts.fraud_score
--   doc.fdsTrnLog (the transaction)   -> sts.trn_log
--   doc.risk.fraudRisks[] (16 rules)  -> sts.fraud_score_rule (+ sts.rule master)
--   doc.fdsTrnLog.histAggs[] (54)     -> sts.trn_log.hist_aggs (jsonb map)
--
-- Time: STS sends local time (WIB, UTC+7) in trnDate/createdOn and epoch millis
-- in fdsTrnLog.trnDateMs. Local values are kept as `timestamp` (as sent);
-- trn_ts is the absolute instant (timestamptz) from trnDateMs.
--
-- Fields that are always null in the sample (type unknown) are stored as text.
-- Re-type them once real (non-dev) data shows their format.
--
-- Reversible: DROP SCHEMA sts CASCADE;
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS sts;

-- -----------------------------------------------------------------------------
-- Transaction (doc.fdsTrnLog). PK = fdsTrnLogId ("<insrc>.<trnId>").
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sts.trn_log (
    fds_trn_log_id      varchar(100) PRIMARY KEY,  -- fdsTrnLogId, e.g. igate.<uuid>
    insrc               varchar(50),               -- input source, e.g. igate
    trn_id              varchar(100),
    trn_ref_id          varchar(100),
    trn_date            timestamp(3) NOT NULL,     -- trnDate (WIB, as sent)
    trn_ts              timestamptz,               -- from trnDateMs (absolute)
    trn_date_ms         bigint,
    trn_type            varchar(50),               -- normalized, e.g. trf-post
    trn_type_g1         varchar(50),
    trn_type_g2         varchar(50),
    trn_type_g3         varchar(50),
    trn_type_g4         varchar(50),
    trn_type_g5         varchar(50),
    va_flag             boolean,
    financial           boolean,
    reversal            text,
    contain_reversal    text,
    biller              varchar(100),
    auth_type           varchar(50),
    acq_ptc             varchar(50),               -- acquirer participant
    iss_ptc             varchar(50),               -- issuer participant
    dest_ptc            varchar(50),
    cnl_type            varchar(50),               -- channel type, e.g. mobile
    cnl_code            varchar(50),
    user_name           varchar(100),
    user_reg_date       text,
    cif                 varchar(50),
    cust_type           varchar(50),
    cust_sector         varchar(50),
    acc_status          varchar(50),
    employee_status     varchar(50),
    src_acc             varchar(64),
    dest_acc            varchar(64),
    card_num            varchar(64),               -- PAN/masked card number (sensitive)
    src_name            varchar(200),
    dest_name           varchar(200),
    src_msisdn          varchar(32),
    dest_msisdn         varchar(32),
    src_email           varchar(200),
    dest_email          varchar(200),
    ccy                 varchar(10),
    amount              numeric(20,2),
    balance             numeric(20,2),
    amount_group        varchar(50),               -- e.g. mediumAmount
    amount_group_cst    varchar(50),
    fee                 numeric(20,2),
    cash_back           numeric(20,2),
    tips                numeric(20,2),
    total               numeric(20,2),
    location            text,
    country             varchar(50),
    city                varchar(100),
    ip                  varchar(64),
    trn_status          varchar(30),               -- e.g. success
    rc                  varchar(10),               -- response code
    src_acc_class       varchar(50),
    dest_acc_class      varchar(50),
    user_agent          text,
    ua_family           varchar(100),
    ua_ver              varchar(50),
    ua_os               varchar(100),
    ua_os_ver           varchar(50),
    ua_device           varchar(100),
    rsv_key1            text,
    rsv_key2            text,
    rsv_text1           text,
    rsv_text2           text,
    rsv_bool1           boolean,
    rsv_bool2           boolean,
    rsv_date1           text,
    rsv_date2           text,
    rsv_long1           bigint,
    rsv_long2           bigint,
    other_fields        jsonb,                     -- otherFields[] as {key: value}
    original_data       jsonb,                     -- originalData (raw codes from source)
    location_tags       jsonb,
    labels              jsonb,
    hist_aggs           jsonb,                     -- histAggs[] as {queryCode: result}
    sts_created_on      timestamp(3),              -- fdsTrnLog.createdOn (WIB)
    sts_updated_on      timestamp(3),              -- fdsTrnLog.updatedOn (WIB)
    synced_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_sts_trn_log_trn_date      ON sts.trn_log (trn_date DESC);
CREATE INDEX IF NOT EXISTS ix_sts_trn_log_src_acc_date  ON sts.trn_log (src_acc, trn_date DESC);
CREATE INDEX IF NOT EXISTS ix_sts_trn_log_dest_acc_date ON sts.trn_log (dest_acc, trn_date DESC);
CREATE INDEX IF NOT EXISTS ix_sts_trn_log_cif           ON sts.trn_log (cif) WHERE cif IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Fraud score (doc header + doc.risk). PK = fdsFraudScoreId.
-- No FK to trn_log so a score can land before/without its transaction row.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sts.fraud_score (
    fds_fraud_score_id        varchar(40) PRIMARY KEY,   -- fdsFraudScoreId
    fds_trn_log_id            varchar(100) NOT NULL,     -- -> sts.trn_log
    req_src                   varchar(30),               -- e.g. stream
    trn_date                  timestamp(3) NOT NULL,     -- trnDate (WIB)
    risk                      integer,                   -- risk.risk (total score)
    risk_by_acc_d1            integer,                   -- risk.riskByAccD1
    risk_level_code           varchar(20),               -- low / medium / ...
    risk_level                smallint,                  -- 0, 1, ...
    risk_level_min_risk       integer,                   -- threshold of that level
    alert                     boolean NOT NULL DEFAULT false,
    alert_by_aggregate_risk   boolean,
    alert_by_override_reject  boolean,
    alert_by_rules            jsonb,                     -- alertDetail.byRules[] (empty in sample)
    override_allow            boolean,
    override_reject           boolean,
    setting_code              varchar(50),               -- e.g. dev
    setting_version           integer,
    score_calc_code           varchar(50),               -- e.g. default-mobile
    selector_code             varchar(50),               -- e.g. mobile
    match_rules               text[],                    -- rule codes that fired
    message                   text,
    sts_created_on            timestamp(3),              -- doc createdOn (WIB)
    synced_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_sts_fraud_score_trn_date   ON sts.fraud_score (trn_date DESC);
CREATE INDEX IF NOT EXISTS ix_sts_fraud_score_trn_log    ON sts.fraud_score (fds_trn_log_id);
CREATE INDEX IF NOT EXISTS ix_sts_fraud_score_level_date ON sts.fraud_score (risk_level_code, trn_date DESC);
CREATE INDEX IF NOT EXISTS ix_sts_fraud_score_alert_date ON sts.fraud_score (trn_date DESC) WHERE alert;
CREATE INDEX IF NOT EXISTS ix_sts_fraud_score_match      ON sts.fraud_score USING gin (match_rules);

-- -----------------------------------------------------------------------------
-- Rule master (ruleCode -> ruleName), maintained by the sync.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sts.rule (
    rule_code   varchar(100) PRIMARY KEY,
    rule_name   varchar(300),
    first_seen  timestamptz NOT NULL DEFAULT now(),
    last_seen   timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Per-rule result of one score (doc.risk.fraudRisks[]).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sts.fraud_score_rule (
    fds_fraud_score_id  varchar(40)  NOT NULL REFERENCES sts.fraud_score (fds_fraud_score_id) ON DELETE CASCADE,
    rule_code           varchar(100) NOT NULL,           -- -> sts.rule
    risk                integer,                         -- ifdsRisk.risk
    override_allow      integer,                         -- ifdsRisk.overrideAllow
    override_reject     integer,                         -- ifdsRisk.overrideReject
    note                text,                            -- evaluation note (value vs range)
    PRIMARY KEY (fds_fraud_score_id, rule_code)
);

CREATE INDEX IF NOT EXISTS ix_sts_fraud_score_rule_hit ON sts.fraud_score_rule (rule_code) WHERE risk > 0;

-- -----------------------------------------------------------------------------
-- Sync bookkeeping: one row per source index.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sts.sync_state (
    source_index        varchar(100) PRIMARY KEY,        -- e.g. dev_1_fds_fraud_score
    last_trn_date       timestamp(3),                    -- watermark (max trnDate synced)
    last_score_id       varchar(40),                     -- tie-breaker at the watermark
    last_run_started    timestamptz,
    last_run_finished   timestamptz,
    last_run_status     varchar(20),                     -- running / success / failed
    last_run_rows       integer,
    last_error          text,
    total_rows          bigint NOT NULL DEFAULT 0
);

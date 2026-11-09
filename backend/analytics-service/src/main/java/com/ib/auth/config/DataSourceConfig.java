package com.ib.auth.config;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.flyway.FlywayDataSource;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Two datasources:
 *
 *  1. PRIMARY (dataSource): the main analytics DB (currently altair_demo via
 *     EXEC_DB_* / SPRING_DATASOURCE_*). Marked Primary so every existing
 *     repository (and Flyway) keeps using it unchanged.
 *
 *  2. SECONDARY (bagDemoDataSource): a READ-ONLY connection to the new bag_demo
 *     database, used only by the Customer Matrix pilot. Configured via BAG_DB_*
 *     env (host/port/user/password default to the EXEC_DB_* ones; db name
 *     defaults to bag_demo). Exposed as bagDemoJdbcTemplate.
 *
 * We bind via DataSourceProperties (which maps `url` -> Hikari `jdbcUrl`
 * correctly) and apply the per-datasource `.hikari` settings.
 */
@Configuration
public class DataSourceConfig {

    // ---- Primary ----

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties dataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @Primary
    @FlywayDataSource
    @ConfigurationProperties("spring.datasource.hikari")
    public DataSource dataSource(@Qualifier("dataSourceProperties") DataSourceProperties props) {
        return props.initializeDataSourceBuilder().build();
    }

    @Bean
    @Primary
    public JdbcTemplate jdbcTemplate(@Qualifier("dataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    // ---- Secondary: bag_demo (read-only pilot) ----

    @Bean
    @ConfigurationProperties("bag.datasource")
    public DataSourceProperties bagDemoDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @ConfigurationProperties("bag.datasource.hikari")
    public DataSource bagDemoDataSource(
            @Qualifier("bagDemoDataSourceProperties") DataSourceProperties props) {
        return props.initializeDataSourceBuilder().build();
    }

    @Bean
    public JdbcTemplate bagDemoJdbcTemplate(@Qualifier("bagDemoDataSource") DataSource bagDemoDataSource) {
        return new JdbcTemplate(bagDemoDataSource);
    }
}

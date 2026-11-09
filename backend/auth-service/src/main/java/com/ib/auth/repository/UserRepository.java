package com.ib.auth.repository;

import com.ib.auth.dto.UserDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbcTemplate;
    String sql = "select u.id, u.username, u.password, u.email, " +
            "u.first_name, u.last_name, u.phone_number, u.app_lang, u.app_row_per_page, " +
            "u.status, u.login_failed_count " +
            "from auth.users u ";
    String sqlCount = "select count(1) " +
            "from auth.users u ";
    String order_by = " order by u.first_name, u.last_name ";

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<UserDto> userWithPasswordMapper = (rs, rowNum) -> {
        UserDto u = new UserDto();
        u.setId(rs.getLong("id"));
        u.setUsername(rs.getString("username"));
        u.setEmail(rs.getString("email"));
        u.setPassword(rs.getString("password"));
        u.setPhoneNumber(rs.getString("phone_number"));
        u.setAppLang(rs.getString("app_lang"));
        u.setAppRowPerPage(rs.getString("app_row_per_page"));
        u.setStatus(rs.getInt("status"));
        u.setLoginFailedCount(rs.getInt("login_failed_count"));
        String firstName = rs.getString("first_name");
        String lastName = rs.getString("last_name");
        firstName = (firstName == null ? "" : firstName);
        lastName = (lastName == null ? "" : lastName);
        String fullName = firstName + (lastName.isEmpty() ? "" : " " + lastName);
        u.setFirstName(firstName);
        u.setLastName(lastName);
        u.setFullName(fullName);
        return u;
    };

    private final RowMapper<UserDto> userWithoutPasswordMapper = (rs, rowNum) -> {
        UserDto u = new UserDto();
        u.setId(rs.getLong("id"));
        u.setUsername(rs.getString("username"));
        u.setEmail(rs.getString("email"));
        u.setPhoneNumber(rs.getString("phone_number"));
        u.setAppLang(rs.getString("app_lang"));
        u.setAppRowPerPage(rs.getString("app_row_per_page"));
        u.setStatus(rs.getInt("status"));
        u.setLoginFailedCount(rs.getInt("login_failed_count"));
        String firstName = rs.getString("first_name");
        String lastName = rs.getString("last_name");
        firstName = (firstName == null ? "" : firstName);
        lastName = (lastName == null ? "" : lastName);
        String fullName = firstName + (lastName.isEmpty() ? "" : " " + lastName);
        u.setFirstName(firstName);
        u.setLastName(lastName);
        u.setFullName(fullName);
        return u;
    };

    public List<UserDto> findAll() {
        return jdbcTemplate.query(
                sql + order_by,
                userWithoutPasswordMapper
        );
    }

    public List<UserDto> findAll(int limit, int offset, String keyword) {
        String sqlSelect = sql;
        if (keyword != null && !keyword.equals("")) {
            keyword = keyword.toUpperCase();
            sqlSelect += " where ( upper(u.username) like CONCAT('%', ?, '%') or upper(u.first_name) like CONCAT('%', ?, '%') or upper(u.last_name) like CONCAT('%', ?, '%') ) " +
                    order_by +
                    " LIMIT ? OFFSET ? ";
            return jdbcTemplate.query(sqlSelect,
                    userWithoutPasswordMapper,
                    keyword, keyword, keyword,
                    limit, offset);
        }
        sqlSelect += order_by + " LIMIT ? OFFSET ? ";

        return jdbcTemplate.query(sqlSelect,
                userWithoutPasswordMapper,
                limit, offset);
    }

    public int countAll(String keyword) {
        if (keyword != null && !keyword.isEmpty()) {
            keyword = keyword.toUpperCase();
            String sqlSelectCount = sqlCount +
                " where ( upper(u.username) like CONCAT('%', ?, '%') " +
                "or upper(u.first_name) like CONCAT('%', ?, '%') " +
                "or upper(u.last_name) like CONCAT('%', ?, '%') ) ";
            return jdbcTemplate.queryForObject(sqlSelectCount, Integer.class,
                keyword, keyword, keyword);
        }
        return jdbcTemplate.queryForObject(sqlCount, Integer.class);
    }

    public UserDto findProfileById(Long id) {
        UserDto userDto = jdbcTemplate.queryForObject(
                sql + " where id = ? ",
                userWithPasswordMapper,
                id
        );

        return userDto;
    }

    public UserDto findByUsername(String username) {

        List<UserDto> users = jdbcTemplate.query(
                sql + " WHERE username = ? or phone_number = ? ",
                userWithPasswordMapper,
                username,
                username
        );

        return users.isEmpty() ? null : users.get(0);
    }

    public int insert(UserDto user) {
        String sqlInsert = "INSERT INTO auth.users (" +
                "username, first_name, last_name, phone_number, email, " +
                "password, app_lang, created_by) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        return jdbcTemplate.update(
                sqlInsert,
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber(),
                user.getEmail(),
                user.getPassword(),
                user.getAppLang(),
                user.getCreatedBy()
        );
    }

    public int update(UserDto user) {
        if (user.getPassword() != null) {
            String sql = "update auth.users " +
                    "set first_name = ?, last_name = ?, email = ?, phone_number = ?, " +
                    "app_lang = ?, status = COALESCE(?, status), updated_by = ?, updated_at = now(), password = ? " +
                    "where id = ? ";
            return jdbcTemplate.update(
                    sql,
                    user.getFirstName(), user.getLastName(), user.getEmail(), user.getPhoneNumber(),
                    user.getAppLang(), user.getStatus(), user.getUpdatedBy(), user.getPassword(),
                    user.getId()
            );
        } else {
            String sql = "update auth.users " +
                    "set first_name = ?, last_name = ?, email = ?, phone_number = ?, " +
                    "app_lang = ?, status = COALESCE(?, status), updated_by = ?, updated_at = now() " +
                    "where id = ? ";
            return jdbcTemplate.update(
                    sql,
                    user.getFirstName(), user.getLastName(), user.getEmail(), user.getPhoneNumber(),
                    user.getAppLang(), user.getStatus(), user.getUpdatedBy(),
                    user.getId()
            );
        }
    }

    public int deleteById(Long id) {
        return jdbcTemplate.update(
                "DELETE FROM auth.users WHERE id = ?",
                id
        );
    }

    public void incrementLoginFailedCount(Long userId) {
        jdbcTemplate.update(
                "UPDATE auth.users SET login_failed_count = login_failed_count + 1 WHERE id = ?",
                userId
        );
    }

    public void resetLoginFailedCount(Long userId) {
        jdbcTemplate.update(
                "UPDATE auth.users SET login_failed_count = 0 WHERE id = ?",
                userId
        );
    }

    public void updateStatus(Long userId, int status) {
        jdbcTemplate.update(
                "UPDATE auth.users SET status = ?, updated_at = now() WHERE id = ?",
                status, userId
        );
    }
}

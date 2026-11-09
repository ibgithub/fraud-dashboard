package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.BranchDto;
import com.ib.auth.repository.BranchRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Branch master endpoints, backed by ods.m_branch.
 */
@RestController
@RequestMapping("/api/v1/executive/branches")
public class BranchController {

    private final BranchRepository branchRepository;

    public BranchController(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    /**
     * GET /api/v1/executive/branches
     * Returns all branches as {code, name} pairs for branch selectors.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<BranchDto>>> getBranches() {
        List<BranchDto> data = branchRepository.findAll();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "branches.fetched", data)
        );
    }
}

import test from "node:test";
import assert from "node:assert/strict";

import User from "../Models/User.js";
import * as adminService from "../services/adminService.js";

test("listUsers rejects invalid role filter", async () => {
  const result = await adminService.listUsers({ role: "superadmin" });

  assert.equal(result.status, 400);
  assert.equal(result.message, "Invalid role filter");
});

test("listDonations rejects invalid status filter", async () => {
  const result = await adminService.listDonations({ status: "REFUNDED" });

  assert.equal(result.status, 400);
  assert.equal(result.message, "Invalid donation status filter");
});

test("updateUserStatus blocks admin self-downgrade", async () => {
  const originalFindById = User.findById;

  User.findById = async () => ({
    _id: { toString: () => "admin-user-id" },
    email: "admin@example.com",
    role: "admin",
    save: async () => {
      throw new Error("save should not be called");
    },
  });

  try {
    const result = await adminService.updateUserStatus({
      userId: "admin-user-id",
      adminUserId: "admin-user-id",
      role: "donor",
      isOrganizerApproved: true,
    });

    assert.equal(result.status, 400);
    assert.equal(result.message, "Admin cannot remove own admin role");
  } finally {
    User.findById = originalFindById;
  }
});

test("updateUserStatus enforces organizer approval invariant", async () => {
  const originalFindById = User.findById;

  User.findById = async () => ({
    _id: { toString: () => "target-user-id" },
    email: "target@example.com",
    role: "donor",
    save: async () => {
      throw new Error("save should not be called");
    },
  });

  try {
    const result = await adminService.updateUserStatus({
      userId: "target-user-id",
      adminUserId: "admin-user-id",
      role: "organizer",
      isOrganizerApproved: false,
    });

    assert.equal(result.status, 400);
    assert.equal(
      result.message,
      "Organizer role requires isOrganizerApproved=true",
    );
  } finally {
    User.findById = originalFindById;
  }
});

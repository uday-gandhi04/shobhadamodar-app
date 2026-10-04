export const ACCOUNT_STATUSES = ["ACTIVE", "INACTIVE", "BANNED"];

export const effectiveAccountStatus = (user) => {
  if (ACCOUNT_STATUSES.includes(user?.accountStatus)) {
    return user.accountStatus;
  }

  return user?.isActive === false ? "INACTIVE" : "ACTIVE";
};

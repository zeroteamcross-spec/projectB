export function buyerLoginCredentials(identifier, password) {
  const value = String(identifier ?? "").trim();
  return value.includes("@")
    ? { email: value, password }
    : { buyer_username: value.toLowerCase(), password };
}

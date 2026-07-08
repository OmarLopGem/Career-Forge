export function getStoredUser() {
  if (typeof window === "undefined") return null;

  const storedUser = localStorage.getItem("careerForgeUser");

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("careerForgeUser");
    return null;
  }
}

export function saveUserSession(user, token = "") {
  localStorage.setItem("careerForgeUser", JSON.stringify(user));

  if (token) {
    localStorage.setItem("careerForgeToken", token);
  }
}

export function clearUserSession() {
  localStorage.removeItem("careerForgeUser");
  localStorage.removeItem("careerForgeToken");
}

export function isLoggedIn() {
  return !!getStoredUser();
}

export function isAdmin() {
  const user = getStoredUser();
  return user?.role === "admin";
}
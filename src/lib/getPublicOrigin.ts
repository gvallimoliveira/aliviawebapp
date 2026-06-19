export const getPublicOrigin = () => {
  const origin = window.location.origin;
  if (origin.includes("localhost")) {
    return "https://aliviawebapp.com.br";
  }
  return origin;
};

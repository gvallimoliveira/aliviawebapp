export const getPublicOrigin = () => {
  const origin = window.location.origin;
  if (
    origin.includes("id-preview--") ||
    origin.includes("localhost") ||
    origin.includes(".lovableproject.com") ||
    origin.includes(".lovable.app")
  ) {
    return "https://aliviawebapp.com.br";
  }
  return origin;
};

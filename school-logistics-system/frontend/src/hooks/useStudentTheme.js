import { useEffect, useState } from "react";

export default function useStudentTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("srmsDashboardTheme") === "dark");

  useEffect(() => {
    localStorage.setItem("srmsDashboardTheme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return [isDarkMode, setIsDarkMode];
}

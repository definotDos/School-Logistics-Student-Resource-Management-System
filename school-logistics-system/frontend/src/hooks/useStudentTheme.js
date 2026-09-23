import { useEffect, useState } from "react";

export default function useStudentTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => sessionStorage.getItem("srmsDashboardTheme") === "dark");

  useEffect(() => {
    sessionStorage.setItem("srmsDashboardTheme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return [isDarkMode, setIsDarkMode];
}

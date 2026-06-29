import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { ThemeContext, type Theme } from "./ThemeContext";

type Props = {
  children: ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      return "dark";
    }

    return "light";
  });

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      const nextTheme = prevTheme === "light" ? "dark" : "light";

      localStorage.setItem("theme", nextTheme);

      return nextTheme;
    });
  }, []);

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
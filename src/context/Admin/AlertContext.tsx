// context/AlertContext.tsx
import React, { createContext, useContext, useState } from "react";
import Alert from "@/components/Shared/alerts/alert";

type AlertContextType = {
  showAlert: (message: string, type: "success" | "error" | "info" | "warning") => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);

  const showAlert = (message: string, type: "success" | "error" | "info" | "warning") => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, 5000); // Alert will disappear after 5 seconds
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <Alert
          message={alert.message}
          type={alert.type as "success" | "error" | "info" | "warning"}
          onClose={() => setAlert(null)}
        />
      )}
    </AlertContext.Provider>
  );
};

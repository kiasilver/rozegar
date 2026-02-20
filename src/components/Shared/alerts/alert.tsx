// components/Alert.tsx
import React from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  
  XMarkIcon,
} from "@heroicons/react/24/outline";

type AlertProps = {
  message: string;
  type: "success" | "error" | "info" | "warning";
  onClose: () => void;
};

const Alert: React.FC<AlertProps> = ({ message, type, onClose }) => {
  let bgColor: string;
  let Icon: React.ElementType;

  switch (type) {
    case "success":
      bgColor = "bg-green-100 text-green-700 border-green-500";
      Icon = CheckCircleIcon;
      break;
    case "error":
      bgColor = "bg-red-100 text-red-700";
      Icon = ExclamationCircleIcon;
      break;
    case "info":
      bgColor = "bg-blue-100 text-blue-700";
      Icon = InformationCircleIcon;
      break;
    case "warning":
      bgColor = "bg-yellow-100 text-yellow-700";
      Icon = ExclamationTriangleIcon;
      break;
    default:
      bgColor = "bg-blue-100 text-blue-700";
      Icon = InformationCircleIcon;
      break;
  }

  return (
    <div
      className={`fixed top-5 m-auto p-4 left-0 right-0 w-fit rounded-md z-[999] shadow-md ${bgColor} flex items-center gap-3`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-sm font-medium mt-[2px]">{message}</span>
      <button onClick={onClose} className="ml-4 text-inherit">
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Alert;

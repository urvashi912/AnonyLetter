import { toast as defaultToast } from "react-toastify";

export function useToast() {
  return {
    toast: (message: string, type: "info" | "success" | "error" = "info") => {
      defaultToast[type](message);
    },
  };
}

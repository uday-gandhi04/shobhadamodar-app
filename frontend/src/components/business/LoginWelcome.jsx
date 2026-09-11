import { useTranslation } from "react-i18next";

const LoginWelcome = () => {
  const { t, i18n } = useTranslation();

  const language =
    i18n.language?.split("-")[0] || "en";

  return (
    <div className="space-y-1">
      <h1
        className="
          text-[25px]
          font-semibold
          leading-[1.12]
          tracking-[-0.025em]
          text-slate-950
        "
      >
        {language === "en"
          ? "Welcome Back"
          : t("login.welcome")}
      </h1>

      <p
        className="
          mt-2
          text-[13px]
          font-normal
          leading-[1.45]
          text-slate-500
        "
      >
        {language === "mr"
          ? "आजची शिफ्ट सुरू करण्यासाठी साइन इन करा."
          : language === "hi"
            ? "आज की शिफ्ट शुरू करने के लिए साइन इन करें।"
            : "Sign in to access today's shift operations."}
      </p>
    </div>
  );
};

export default LoginWelcome;
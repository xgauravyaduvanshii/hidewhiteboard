import { Tooltip } from "@hidewhiteboard/hidewhiteboard/components/Tooltip";
import { shield } from "@hidewhiteboard/hidewhiteboard/components/icons";
import { useI18n } from "@hidewhiteboard/hidewhiteboard/i18n";

export const EncryptedIcon = () => {
  const { t } = useI18n();

  return (
    <a
      className="encrypted-icon tooltip"
      href="https://flyingdarkdev.com/blog/end-to-end-encryption"
      target="_blank"
      rel="noopener"
      aria-label={t("encrypted.link")}
    >
      <Tooltip label={t("encrypted.tooltip")} long={true}>
        {shield}
      </Tooltip>
    </a>
  );
};

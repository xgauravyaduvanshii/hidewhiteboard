import { Dialog } from "@hidewhiteboard/hidewhiteboard/components/Dialog";
import { FilledButton } from "@hidewhiteboard/hidewhiteboard/components/FilledButton";
import React, { useEffect, useState } from "react";

import { STORAGE_KEYS } from "../app_constants";

import "./LLMSettingsDialog.scss";

export const LLMSettingsDialog = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_LLM_API_KEY);
    if (saved) {
      setApiKey(saved);
    }
  }, []);

  return (
    <Dialog
      size="small"
      title="LLM Settings"
      onCloseRequest={onClose}
      className="llm-settings-dialog"
    >
      <div className="llm-settings-dialog__body">
        <label className="llm-settings-dialog__label" htmlFor="llm-api-key">
          API key
        </label>
        <input
          id="llm-api-key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Paste your API key"
          className="llm-settings-dialog__input"
        />

        <div className="llm-settings-dialog__hint">
          Don&apos;t have an API key? Create one here:
          <a
            href="https://dark.groovicart.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://dark.groovicart.com/dashboard
          </a>
        </div>

        <div className="llm-settings-dialog__actions">
          <button
            type="button"
            className="llm-settings-dialog__clear"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEYS.LOCAL_STORAGE_LLM_API_KEY);
              setApiKey("");
            }}
          >
            Clear
          </button>
          <FilledButton
            label="Save"
            onClick={() => {
              localStorage.setItem(
                STORAGE_KEYS.LOCAL_STORAGE_LLM_API_KEY,
                apiKey.trim(),
              );
              onClose();
            }}
          />
        </div>
      </div>
    </Dialog>
  );
};

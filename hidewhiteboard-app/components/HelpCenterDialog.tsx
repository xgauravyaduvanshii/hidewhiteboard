import { Dialog } from "@hidewhiteboard/hidewhiteboard/components/Dialog";
import React from "react";

type HelpCenterDialogProps = {
  onClose: () => void;
};

export const HelpCenterDialog = ({ onClose }: HelpCenterDialogProps) => {
  return (
    <Dialog
      title="HideWhiteboard Help Center"
      className="hidewhiteboard-help-dialog"
      onCloseRequest={onClose}
    >
      <div className="hidewhiteboard-help-dialog__hero">
        <h3>Contact & Support</h3>
        <p>For setup, issues, and collaboration support, use these details.</p>
      </div>
      <div className="hidewhiteboard-help-dialog__grid">
        <div className="hidewhiteboard-help-dialog__card">
          <div className="hidewhiteboard-help-dialog__label">Author</div>
          <div className="hidewhiteboard-help-dialog__value">
            xgauravyaduvanshii
          </div>
        </div>
        <div className="hidewhiteboard-help-dialog__card">
          <div className="hidewhiteboard-help-dialog__label">Name</div>
          <div className="hidewhiteboard-help-dialog__value">
            xgauravyaduvanshii
          </div>
        </div>
        <div className="hidewhiteboard-help-dialog__card">
          <div className="hidewhiteboard-help-dialog__label">Email</div>
          <div className="hidewhiteboard-help-dialog__value">
            xgauravyaduvanshii@gmail.com
          </div>
        </div>
        <div className="hidewhiteboard-help-dialog__card">
          <div className="hidewhiteboard-help-dialog__label">Profile</div>
          <a
            className="hidewhiteboard-help-dialog__link"
            href="https://github.com/xgauravyaduvanshii"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://github.com/xgauravyaduvanshii
          </a>
        </div>
      </div>
    </Dialog>
  );
};

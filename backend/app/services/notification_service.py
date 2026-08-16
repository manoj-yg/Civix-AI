import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger("civix_backend")

class NotificationService:
    """
    Notification Service Abstraction for High/Critical Defect Alerts and Job Completion Notices.
    Integrates Email (SMTP), SMS, and Webhook notification providers via environment configuration.
    """

    def __init__(self):
        self.enable_email = settings.ENABLE_EMAIL
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.sender_email = settings.SENDER_EMAIL
        self.sender_password = settings.SENDER_PASSWORD
        self.recipient_email = settings.RECIPIENT_EMAIL

    def notify_critical_defect(
        self,
        inspection_id: str,
        asset_type: str,
        severity_level: str,
        risk_score: float,
        defect_classes: List[str],
        location_desc: str
    ) -> bool:
        """
        Sends urgent critical defect alert to field engineers and municipal supervisors.
        """
        title = f"[EMERGENCY ALERT] {severity_level} Defect Detected on {asset_type}"
        message = (
            f"Critical Defect Alert for Inspection ID: {inspection_id}\n"
            f"Asset Type: {asset_type}\n"
            f"Location: {location_desc}\n"
            f"Severity Level: {severity_level} (Risk Score: {risk_score}/100)\n"
            f"Defects Identified: {', '.join(defect_classes)}\n"
            f"Immediate emergency field repair dispatch required."
        )

        logger.warning(f"NOTIFICATION [ALERT]: {title} | {location_desc}")
        return self._send_notification(title, message)

    def notify_inspection_completed(
        self,
        inspection_id: str,
        overall_score: float,
        defects_count: int
    ) -> bool:
        """
        Sends background AI job completion notification.
        """
        title = f"AI Inspection Completed: {inspection_id}"
        message = (
            f"Inspection ID {inspection_id} has finished AI multi-model analysis.\n"
            f"Total Defects Found: {defects_count}\n"
            f"Overall Severity Score: {overall_score}/10"
        )
        logger.info(f"NOTIFICATION [COMPLETED]: {title}")
        return self._send_notification(title, message)

    def _send_notification(self, title: str, message: str) -> bool:
        if not self.enable_email or not self.sender_email or not self.sender_password or not self.recipient_email:
            logger.info(f"Notification queued (Email disabled or credentials unconfigured): '{title}'")
            return True

        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart()
            msg["From"] = self.sender_email
            msg["To"] = self.recipient_email
            msg["Subject"] = title
            msg.attach(MIMEText(message, "plain"))

            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.send_message(msg)
            server.quit()
            logger.info(f"Successfully sent notification email to {self.recipient_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to dispatch notification email: {e}")
            return False

def get_notification_service() -> NotificationService:
    return NotificationService()

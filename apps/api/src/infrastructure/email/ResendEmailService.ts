import { Resend } from 'resend'
import { env } from '../../shared/env.js'
import type { IEmailService, SendInviteParams, SendPasswordResetParams } from './IEmailService.js'

export class ResendEmailService implements IEmailService {
  private readonly client = new Resend(env.RESEND_API_KEY)
  private readonly from = env.EMAIL_FROM

  async sendInvite({ to, fullName, invitedByName, acceptUrl }: SendInviteParams) {
    await this.client.emails.send({
      from: this.from,
      to,
      subject: 'OCR Studio — You have been invited',
      html: `
        <p>Hi ${fullName},</p>
        <p>${invitedByName} has invited you to access OCR Studio.</p>
        <p>
          <a href="${acceptUrl}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
            Accept invitation
          </a>
        </p>
        <p>This link expires in 72 hours.</p>
      `,
    })
  }

  async sendPasswordReset({ to, fullName, resetUrl }: SendPasswordResetParams) {
    await this.client.emails.send({
      from: this.from,
      to,
      subject: 'OCR Studio — Password reset',
      html: `
        <p>Hi ${fullName},</p>
        <p>Click the link below to reset your password. The link expires in 1 hour.</p>
        <p>
          <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
            Reset password
          </a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    })
  }
}

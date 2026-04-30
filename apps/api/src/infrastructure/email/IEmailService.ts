export interface SendInviteParams {
  to: string
  fullName: string
  invitedByName: string
  acceptUrl: string
}

export interface SendPasswordResetParams {
  to: string
  fullName: string
  resetUrl: string
}

export interface IEmailService {
  sendInvite(params: SendInviteParams): Promise<void>
  sendPasswordReset(params: SendPasswordResetParams): Promise<void>
}

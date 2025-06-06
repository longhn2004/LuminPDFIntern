import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendVerificationEmail(
    email: string, 
    token: string
  ) {
    const verificationUrl = `${this.configService.get('APP_URL')}/auth/verify-email?token=${token}`;
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Verify Your Email Address',
      html: `<p>Please verify your email by clicking the link below:</p>
             <a href="${verificationUrl}">Verify Email</a>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendInvitationEmail(
    email: string, 
    token: string, 
    fileName: string, 
    fileId?: string
  ) {
    const appUrl = this.configService.get<string>('APP_URL');
    const invitationUrl = `${appUrl}/auth/signup?invitationToken=${token}`;
    const documentUrl = fileId ? `${appUrl}/dashboard/viewpdf/${fileId}` : null;
    
    const documentLink = documentUrl 
      ? `<p>Once registered, you can access the document directly here: <a href="${documentUrl}">View "${fileName}"</a></p>`
      : '';
    
    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: `Invitation to Collaborate on ${fileName}`,
      html: `
        <p>You have been invited to collaborate on "${fileName}".</p>
        <p>Please register using this link: <a href="${invitationUrl}">Register & Join</a></p>
        ${documentLink}
      `,
    });
  }

  async sendAccessNotification(
    email: string, 
    fileName: string, 
    role: string, 
    fileId: string
  ) {
    const appUrl = this.configService.get<string>('APP_URL');
    const documentUrl = `${appUrl}/dashboard/viewpdf/${fileId}`;
    
    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: `Access Granted to ${fileName}`,
      html: `
        <p>You have been granted ${role} access to "${fileName}".</p>
        <p><a href="${documentUrl}">Click here to view the document</a></p>
        <p>You can also access it from your dashboard at any time.</p>
      `,
    });
  }

  async sendRoleChangedNotification(
    email: string,
    fileName: string,
    role: string,
    fileId: string,
  ) {
    const appUrl = this.configService.get<string>('APP_URL');
    const documentUrl = `${appUrl}/dashboard/viewpdf/${fileId}`;
    
    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: `Role Changed for ${fileName}`,
      html: `
        <p>Your role for "${fileName}" has been changed to ${role}.</p>
        <p><a href="${documentUrl}">Click here to view the document</a></p>
        <p>You can also access it from your dashboard.</p>
      `,
    });
  }

  async sendRoleRemovedNotification(
    email: string,
    fileName: string,
  ) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: `Access Removed for ${fileName}`,
      html: `<p>Your access to "${fileName}" has been removed.</p>`,
    });
  }
}

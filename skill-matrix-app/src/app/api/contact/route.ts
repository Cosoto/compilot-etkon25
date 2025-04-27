import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, subject, message } = await request.json();

    // Validate inputs
    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: 'Email, subject, and message are required' },
        { status: 400 }
      );
    }

    // Log the attempt
    console.log('Attempting to send email:', {
      from: email,
      subject: subject,
      messageLength: message.length
    });

    // Create a transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'cosotomed@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('Transporter verification successful');
    } catch (verifyError) {
      console.error('Transporter verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Email service configuration error' },
        { status: 500 }
      );
    }

    // Email content
    const mailOptions = {
      from: `"ComPilot User" <${email}>`,
      to: 'cosotomed@gmail.com',
      subject: `[ComPilot Support] ${subject}`,
      text: `From: ${email}\n\n${message}`,
      html: `
        <h3>New Support Request from ComPilot</h3>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="margin-top: 20px;">
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `,
    };

    // Send email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return NextResponse.json({ 
        success: true,
        messageId: info.messageId 
      });
    } catch (sendError: unknown) {
      let errorMessage = 'Unknown error';
      let errorCode: string | undefined;
      let errorCommand: string | undefined;
      if (sendError instanceof Error) {
        errorMessage = sendError.message;
        // nodemailer errors may have code/command
        errorCode = typeof ((sendError as unknown as Record<string, unknown>).code) === 'string' ? ((sendError as unknown as Record<string, unknown>).code as string) : undefined;
        errorCommand = typeof ((sendError as unknown as Record<string, unknown>).command) === 'string' ? ((sendError as unknown as Record<string, unknown>).command as string) : undefined;
      }
      console.error('Error sending email:', {
        error: errorMessage,
        code: errorCode,
        command: errorCommand
      });
      return NextResponse.json(
        { 
          error: 'Failed to send email',
          details: errorMessage
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('General error in contact route:', error);
    return NextResponse.json(
      { 
        error: 'Server error',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
} 
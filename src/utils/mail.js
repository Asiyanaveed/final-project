import Mailgen from "mailgen";
import nodemailer from "nodemailer";
import { verify } from "node:crypto";

const sendEmail = async (options) => {
     const mailGenerator = new Mailgen({
       theme: 'default',
       product: {
           // Appears in header & footer of e-mails
           name: 'Project Manager',
           link: 'https://task-manager-app.com/',
       
       }
  });

// emailin text formate
  const emailText =mailGenerator.generatePlaintext(options.mailgenContent);

// email in html formate
  const emailHtml = mailGenerator.generate(options.mailgenContent);


// creating transporter to   sending  email

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_TRAP_SMTP_HOST,
  port: process.env.MAIL_TRAP_SMTP_PORT,
  secure: false, // Use true for port 465, false for port 587
  auth: {
    user: process.env.MAIL_TRAP_SMTP_USER,
    pass: process.env.MAIL_TRAP_SMTP_PASS,
  },
});

   //- defining mail options
   const mail ={
      from: "mail.taskmanager@example.com",
      to: options.email,
      subject: options.subject,
      text: emailText,
      html: emailHtml,
   }

   // sending email
    try{
        await transporter.sendMail(mail);
    }catch(error){
        console.error("❌ Email not sent", error);
    }


}


//-------------------------------------email verification mailgen content-------------------------------------
const emailVerificationMailgenContent = (username,verificationUrl) =>{
    return {
        body: {
        name: username,
        intro: 'Welcome to  our App ! we are excited to have you on board.',
        action: {
            instructions: 'To get started with our app, please click here:',
            button: {
                color: '#32c6f3ff', // Optional action button color
                text: 'Confirm your account',
                link: verificationUrl
            }
        },
        outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
    }
    }
}

//-------------------------------------forgot password mailgen content-------------------------------------

const forgetPasswordMailgenContent = (username, passwordResetUrl) =>{
    return {
        body: {
        name: username,
        intro: 'you have requested a password reset.',
        action: {
            instructions: 'To reset your password, please click here:',
            button: {
                color: '#6977f7ff', // Optional action button color
                text: 'Reset your password',
                link: passwordResetUrl
            }
        },
        outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
    }
    }
}

export {emailVerificationMailgenContent,forgetPasswordMailgenContent,  sendEmail};

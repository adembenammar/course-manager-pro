import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  to: string;
  toName: string;
  type: "submission_received" | "submission_graded" | "new_course" | "comment_added";
  data: {
    courseName?: string;
    subjectName?: string;
    grade?: number;
    feedback?: string;
    studentName?: string;
    professorName?: string;
    commentAuthor?: string;
  };
}

const getEmailContent = (type: string, data: NotificationRequest["data"], toName: string) => {
  const baseStyles = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3B82F6, #8B5CF6); padding: 40px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 40px; }
    .content h2 { color: #1f2937; margin-top: 0; }
    .content p { color: #6b7280; line-height: 1.6; }
    .highlight { background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .grade { font-size: 48px; font-weight: bold; color: #10B981; text-align: center; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 14px; }
  `;

  switch (type) {
    case "submission_received":
      return {
        subject: `📝 Nouvelle soumission - ${data.courseName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header"><h1>📚 EduPlatform</h1></div>
              <div class="content">
                <h2>Nouvelle soumission reçue</h2>
                <p>Bonjour ${toName},</p>
                <p>Un étudiant a soumis un travail pour votre cours.</p>
                <div class="highlight">
                  <strong>Étudiant:</strong> ${data.studentName}<br>
                  <strong>Cours:</strong> ${data.courseName}<br>
                  <strong>Matière:</strong> ${data.subjectName}
                </div>
              </div>
              <div class="footer"><p>© 2024 EduPlatform</p></div>
            </div>
          </body>
          </html>
        `,
      };

    case "submission_graded":
      return {
        subject: `🎓 Votre travail a été noté - ${data.courseName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header"><h1>📚 EduPlatform</h1></div>
              <div class="content">
                <h2>Votre travail a été noté!</h2>
                <p>Bonjour ${toName},</p>
                <p>Votre professeur a noté votre travail pour le cours <strong>${data.courseName}</strong>.</p>
                <div class="grade">${data.grade}/20</div>
                ${data.feedback ? `<div class="highlight"><strong>Commentaire:</strong><br>${data.feedback}</div>` : ''}
              </div>
              <div class="footer"><p>© 2024 EduPlatform</p></div>
            </div>
          </body>
          </html>
        `,
      };

    case "new_course":
      return {
        subject: `📖 Nouveau cours - ${data.courseName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header"><h1>📚 EduPlatform</h1></div>
              <div class="content">
                <h2>Nouveau cours disponible!</h2>
                <p>Bonjour ${toName},</p>
                <div class="highlight">
                  <strong>Cours:</strong> ${data.courseName}<br>
                  <strong>Matière:</strong> ${data.subjectName}<br>
                  <strong>Professeur:</strong> ${data.professorName}
                </div>
              </div>
              <div class="footer"><p>© 2024 EduPlatform</p></div>
            </div>
          </body>
          </html>
        `,
      };

    default:
      return {
        subject: "Notification EduPlatform",
        html: "<p>Vous avez une nouvelle notification.</p>",
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, toName, type, data }: NotificationRequest = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending ${type} notification to ${to}`);
    const emailContent = getEmailContent(type, data, toName);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "EduPlatform <onboarding@resend.dev>",
        to: [to],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const result = await res.json();
    console.log("Email result:", result);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
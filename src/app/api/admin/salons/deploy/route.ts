import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

/**
 * Deploy a new salon to Vercel.
 * This creates a new Vercel project, sets SALON_ID, and deploys.
 * Requires VERCEL_TOKEN environment variable.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    if (!VERCEL_TOKEN) {
      return NextResponse.json({
        error: "VERCEL_TOKEN تنظیم نشده است",
        instructions: "توکن Vercel را در متغیرهای محیطی تنظیم کنید"
      }, { status: 500 });
    }

    const { salonId, salonName, salonSlug } = await request.json();
    if (!salonId || !salonSlug) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const projectName = `nailbook-${salonSlug}`;

    // 1. Create Vercel project
    const createRes = await fetch("https://api.vercel.com/v10/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        framework: "nextjs",
        buildSettings: {
          framework: "nextjs",
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      // If project already exists, that's OK
      if (err.error?.code !== "invalid_name") {
        return NextResponse.json({ error: `خطا در ایجاد پروژه: ${err.error?.message || createRes.statusText}` }, { status: 500 });
      }
    }

    const project = await createRes.json();
    const projectId = project.id;

    // 2. Set SALON_ID environment variable
    const envVars = [
      { key: "SALON_ID", value: salonId, target: ["production", "preview"] },
      { key: "CUSTOMER_SESSION_SECRET", value: process.env.CUSTOMER_SESSION_SECRET || "", target: ["production", "preview"] },
      { key: "OWNER_SESSION_SECRET", value: process.env.OWNER_SESSION_SECRET || "", target: ["production", "preview"] },
      { key: "SUPER_ADMIN_SESSION_SECRET", value: process.env.SUPER_ADMIN_SESSION_SECRET || "", target: ["production", "preview"] },
    ];

    for (const env of envVars) {
      if (!env.value) continue;
      await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(env),
      });
    }

    // 3. Trigger deployment from GitHub
    const deployRes = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        project: projectId,
        target: "production",
        gitSource: {
          ref: "main",
          repoId: "ODIIISE/nailbook",
          type: "github",
        },
      }),
    });

    const deployment = await deployRes.json();

    return NextResponse.json({
      success: true,
      projectId,
      deploymentUrl: `https://${projectName}.vercel.app`,
      deploymentId: deployment.id,
    });
  } catch (error) {
    console.error("Deploy salon error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

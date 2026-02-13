
// pnpm db:clean-leave-requests
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile(filePath: string) {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
        process.env[key.trim()] = value;
      }
    }
  } catch {
    // Archivo no existe, continuar
  }
}

// Intentar cargar .env.local primero, luego .env
loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

// Verificar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL no está configurada.");
  console.error("   Asegúrate de tener un archivo .env.local o .env con DATABASE_URL configurada.");
  process.exit(1);
}

async function cleanLeaveRequests() {
  // Usar imports dinámicos para cargar después de que las variables de entorno estén configuradas
  const { db } = await import("@/db/client");
  const {
    leaveRequests,
    leaveRequestDays,
    leaveRequestProjects,
    leaveApprovals,
  } = await import("@/db/schema");
  const { sql } = await import("drizzle-orm");
  console.log("🧹 Iniciando limpieza de leave requests...\n");

  try {
    // Contar registros antes de eliminar
    const [leaveRequestsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveRequests);

    const [approvalsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveApprovals);

    const [projectsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveRequestProjects);

    const [daysCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveRequestDays);

    console.log("📊 Registros encontrados:");
    console.log(`   - Leave Requests: ${leaveRequestsCount.count}`);
    console.log(`   - Approvals: ${approvalsCount.count}`);
    console.log(`   - Projects: ${projectsCount.count}`);
    console.log(`   - Days: ${daysCount.count}\n`);

    if (leaveRequestsCount.count === 0) {
      console.log("✅ No hay registros para eliminar.");
      return;
    }

    // Confirmación (en producción, podrías querer agregar un prompt interactivo)
    console.log("⚠️  ADVERTENCIA: Se eliminarán TODOS los registros relacionados con leave requests.");
    console.log("   Presiona Ctrl+C para cancelar en los próximos 3 segundos...\n");
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Eliminar en orden: primero las tablas dependientes, luego la principal
    // Aunque tienen cascade, es mejor hacerlo explícitamente para tener control

    console.log("🗑️  Eliminando aprobaciones...");
    await db.delete(leaveApprovals);
    console.log(`   ✅ Eliminadas ${approvalsCount.count} aprobaciones`);

    console.log("🗑️  Eliminando proyectos asociados...");
    await db.delete(leaveRequestProjects);
    console.log(`   ✅ Eliminados ${projectsCount.count} proyectos asociados`);

    console.log("🗑️  Eliminando días individuales...");
    await db.delete(leaveRequestDays);
    console.log(`   ✅ Eliminados ${daysCount.count} días individuales`);

    console.log("🗑️  Eliminando leave requests principales...");
    await db.delete(leaveRequests);
    console.log(`   ✅ Eliminadas ${leaveRequestsCount.count} leave requests principales`);

    // Verificar que todo se eliminó
    const [remainingRequests] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveRequests);

    const [remainingApprovals] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveApprovals);

    const [remainingProjects] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveRequestProjects);

    const [remainingDays] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveRequestDays);

    console.log("\n📊 Verificación final:");
    console.log(`   - Leave Requests restantes: ${remainingRequests.count}`);
    console.log(`   - Approvals restantes: ${remainingApprovals.count}`);
    console.log(`   - Projects restantes: ${remainingProjects.count}`);
    console.log(`   - Days restantes: ${remainingDays.count}`);

    if (
      remainingRequests.count === 0 &&
      remainingApprovals.count === 0 &&
      remainingProjects.count === 0 &&
      remainingDays.count === 0
    ) {
      console.log("\n✅ ¡Limpieza completada exitosamente!");
    } else {
      console.log("\n⚠️  Algunos registros aún permanecen. Revisa los logs anteriores.");
    }
  } catch (error) {
    console.error("\n❌ Error durante la limpieza:", error);
    throw error;
  }
}

// Ejecutar el script
cleanLeaveRequests()
  .then(() => {
    console.log("\n✨ Script finalizado.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Error fatal:", error);
    process.exit(1);
  });

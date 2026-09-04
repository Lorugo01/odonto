import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { validationExceptionFactory } from "./common/pipes/validation-exception.factory";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  // Fecha HTTP + Prisma ao receber SIGINT/SIGTERM (evita porta órfã no Windows)
  app.enableShutdownHooks();
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: isProduction && allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const shutdown = async (_signal: string) => {
    try {
      await app.close();
    } finally {
      process.exit(0);
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap();

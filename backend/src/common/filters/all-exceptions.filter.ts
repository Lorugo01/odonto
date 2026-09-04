import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import {
  defaultMessageForStatus,
  humanizePrismaError,
  joinUserMessages,
  sanitizeForUser,
} from "../utils/user-facing-error.util";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProduction = process.env.NODE_ENV === "production";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let messages: string[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      messages = this.extractHttpMessages(body);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      if (exception.code === "P2025") status = HttpStatus.NOT_FOUND;
      if (exception.code === "P2002") status = HttpStatus.CONFLICT;
      messages = [humanizePrismaError(exception)];
    } else {
      messages = [defaultMessageForStatus(status)];
    }

    if (messages.length === 0) messages = [defaultMessageForStatus(status)];
    const userMessages = messages.map((m) => sanitizeForUser(m, status, isProduction));
    const message = joinUserMessages(userMessages);

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} → ${status}`);
    }

    response.status(status).json({
      statusCode: status,
      message,
      messages: userMessages,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private extractHttpMessages(body: string | object): string[] {
    if (typeof body === "string") return body.trim() ? [body] : [];
    if (!body || typeof body !== "object") return [];
    const raw = (body as Record<string, unknown>).message;
    if (Array.isArray(raw)) return raw.filter((m): m is string => typeof m === "string");
    if (typeof raw === "string" && raw.trim()) return [raw];
    return [];
  }
}

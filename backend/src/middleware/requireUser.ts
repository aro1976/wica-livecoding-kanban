import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  userEmail: string;
}

/**
 * Formato mínimo do evento API Gateway REST injetado pelo
 * @vendia/serverless-express em req.apiGateway.event, quando a rota usa
 * um Cognito User Pool Authorizer (ver infra/lib/api-stack.ts).
 */
interface ApiGatewayRequest extends Request {
  apiGateway?: {
    event?: {
      requestContext?: {
        authorizer?: {
          claims?: Record<string, string>;
        };
      };
    };
  };
}

/**
 * Decodifica o payload de um JWT (sem validar assinatura). Usado apenas
 * como fallback no modo dev local (Express puro, sem AWS), onde não há
 * API Gateway para validar o token antes da requisição chegar aqui.
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Token JWT malformado.");
  }
  const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(payloadBase64, "base64").toString("utf-8");
  return JSON.parse(json);
}

/**
 * Middleware que extrai o e-mail do usuário autenticado.
 *
 * - Em produção (Lambda atrás do API Gateway com Cognito User Pool
 *   Authorizer): o API Gateway já validou a assinatura e expiração do
 *   token; os claims verificados ficam disponíveis em
 *   req.apiGateway.event.requestContext.authorizer.claims (injetado pelo
 *   @vendia/serverless-express). Usamos esse claim diretamente.
 * - Em dev local (Express puro, sem AWS): não há API Gateway, então
 *   decodificamos o JWT do header Authorization sem validar assinatura.
 *
 * Em ambos os casos, nunca aceitamos identidade vinda de outro header —
 * isso permitiria qualquer cliente se passar por outro usuário.
 */
export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const claims = (req as ApiGatewayRequest).apiGateway?.event?.requestContext
    ?.authorizer?.claims;

  if (claims?.email) {
    (req as AuthenticatedRequest).userEmail = claims.email;
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Header 'Authorization: Bearer <token>' é obrigatório." });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = decodeJwtPayload(token);
    const email = payload.email;
    if (typeof email !== "string" || email.trim().length === 0) {
      res.status(401).json({ error: "Token não contém um e-mail válido." });
      return;
    }
    (req as AuthenticatedRequest).userEmail = email;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido." });
  }
}

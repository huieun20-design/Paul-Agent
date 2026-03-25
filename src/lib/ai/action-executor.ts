import { prisma } from "@/lib/prisma";

interface ActionPayload {
  type: "TODO" | "ORDER" | "PAYMENT" | "INVOICE" | "CLAIM" | "REPLY" | "FOLLOW_UP";
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface ExecutionResult {
  type: string;
  success: boolean;
  id?: string;
  error?: string;
}

export async function executeEmailActions(
  emailId: string,
  userId: string,
  companyId: string,
  actions: ActionPayload[]
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case "TODO": {
          const todo = await prisma.todo.create({
            data: {
              userId,
              title: action.title,
              description: action.description,
              priority: action.priority,
              source: "AI_EMAIL",
              sourceEmailId: emailId,
            },
          });
          results.push({ type: "TODO", success: true, id: todo.id });
          break;
        }

        case "ORDER": {
          const orderCount = await prisma.order.count({ where: { companyId } });
          const order = await prisma.order.create({
            data: {
              companyId,
              orderNumber: `PO-${String(orderCount + 1).padStart(4, "0")}`,
              type: "VENDOR",
              notes: action.description,
              sourceEmailId: emailId,
            },
          });
          results.push({ type: "ORDER", success: true, id: order.id });
          break;
        }

        case "INVOICE": {
          const invCount = await prisma.invoice.count({ where: { companyId } });
          const invoice = await prisma.invoice.create({
            data: {
              companyId,
              invoiceNumber: `INV-${String(invCount + 1).padStart(4, "0")}`,
              type: "VENDOR",
              amount: 0,
              notes: action.description,
              sourceEmailId: emailId,
            },
          });
          results.push({ type: "INVOICE", success: true, id: invoice.id });
          break;
        }

        case "CLAIM": {
          const claim = await prisma.claim.create({
            data: {
              companyId,
              title: action.title,
              description: action.description,
              priority: action.priority,
              sourceEmailId: emailId,
            },
          });
          results.push({ type: "CLAIM", success: true, id: claim.id });
          break;
        }

        case "FOLLOW_UP": {
          const todo = await prisma.todo.create({
            data: {
              userId,
              title: `Follow-up: ${action.title}`,
              description: action.description,
              priority: action.priority,
              source: "AI_FOLLOWUP",
              sourceEmailId: emailId,
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
            },
          });
          results.push({ type: "FOLLOW_UP", success: true, id: todo.id });
          break;
        }

        default:
          results.push({ type: action.type, success: false, error: "Not implemented" });
      }
    } catch (err) {
      results.push({
        type: action.type,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

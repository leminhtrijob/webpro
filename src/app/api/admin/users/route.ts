import { AdminUserController } from '@/controllers/AdminUserController';

export async function GET(request: Request) {
  return AdminUserController.listUsers(request);
}

export async function POST(request: Request) {
  return AdminUserController.createUser(request);
}

export async function PATCH(request: Request) {
  return AdminUserController.updateUser(request);
}

export async function DELETE(request: Request) {
  return AdminUserController.deleteUser(request);
}

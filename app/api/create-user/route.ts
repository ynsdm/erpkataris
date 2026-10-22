// app/api/create-user/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase con privilegios de administrador (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password, full_name, role, vehicle_info, tenant_id, sales_quota, allowed_brands } = await request.json();

    // 1. Crear el usuario directamente en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirma el correo para que pueda iniciar sesión al instante
    });

    if (authError) throw authError;

    if (authData.user) {
      // 2. Insertar los datos correspondientes en la tabla profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          tenant_id: tenant_id,
          full_name: full_name,
          role: role, // 'driver', 'chofer', 'seller', etc.
          vehicle_info: vehicle_info || null,
          sales_quota: sales_quota || 0,
          allowed_brands: allowed_brands || '',
          status: 'active'
        });

      if (profileError) throw profileError;

      return NextResponse.json({ success: true, message: 'Usuario creado con éxito' });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
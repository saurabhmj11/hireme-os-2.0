import { requireAuth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const user = await requireAuth();
    const { number: numberStr } = await params;
    const number = parseInt(numberStr, 10);
    const body = await request.json();
    const { new_status, company, role, score, url, location, salary, date, notes, recruiterEmail, recruiterName, jobType } = body;

    const data: any = {};
    if (new_status) data.status = new_status;
    if (company !== undefined) data.company = company;
    if (role !== undefined) data.role = role;
    if (score !== undefined) data.score = score;
    if (url !== undefined) data.url = url;
    if (location !== undefined) data.location = location;
    if (salary !== undefined) data.salary = salary;
    if (date !== undefined) data.date = date;
    if (notes !== undefined) data.notes = notes;
    if (recruiterEmail !== undefined) data.recruiterEmail = recruiterEmail;
    if (recruiterName !== undefined) data.recruiterName = recruiterName;
    if (jobType !== undefined) data.jobType = jobType;

    const updated = await db.application.update({
      where: { userId_number: { userId: user.id, number } },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

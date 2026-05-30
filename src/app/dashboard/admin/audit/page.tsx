import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';

export default async function AuditLogPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');

  const logs = await prisma.auditLog.findMany({
    include: {
      admin: { select: { displayName: true } },
      targetUser: { select: { displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const actionColors: Record<string, string> = {
    RESULT_ENTERED: 'var(--accent-green)',
    INVITE_CREATED: 'var(--accent-blue)',
    USER_BANNED: 'var(--danger)',
    USER_UNBANNED: 'var(--accent-green)',
    MANUAL_POINT_ADJUSTMENT: 'var(--gold)',
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">All admin actions are tracked</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-desc">No admin actions recorded yet.</div>
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: actionColors[log.action] || 'var(--text-muted)',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      by {log.admin.displayName}
                      {log.targetUser && ` → ${log.targetUser.displayName}`}
                      {log.delta !== null && ` (${log.delta > 0 ? '+' : ''}${log.delta} pts)`}
                    </div>
                    {log.notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {log.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

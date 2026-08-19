import { PageHeader } from "@/components/page-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Platform settings will expand in later phases." />
      <Card>
        <CardHeader>
          <CardTitle>Coming in a future phase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Feature flags, billing providers, and production domain cookie configuration.</p>
          <p>
            Local sessions are shared on localhost across ports. Production `app.smrkomed.com` and
            `admin.smrkomed.com` need `Domain=.smrkomed.com` or independent sign-in against the same
            Auth.js identity store.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

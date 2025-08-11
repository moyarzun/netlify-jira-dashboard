import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

export const StatCard = ({ title, value, icon, children }: StatCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {children && (
          <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

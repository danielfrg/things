import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl font-bold text-muted-foreground/30 mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="space-y-4">
          <Link to="/">
            <Button className="w-full">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

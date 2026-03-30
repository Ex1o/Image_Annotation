import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth-service";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing');
      return;
    }

    verifyEmailToken(token);
  }, [searchParams]);

  const verifyEmailToken = async (token: string) => {
    try {
      const response = await authService.verifyEmail(token);
      setStatus('success');
      setMessage(response.message);
      
      toast({
        title: "Email Verified!",
        description: "Your account has been verified successfully.",
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      setStatus('error');
      const errorMessage = error.response?.data?.detail || 'Verification failed. The link may be invalid or expired.';
      setMessage(errorMessage);
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === 'verifying' && (
                <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              )}
              {status === 'error' && (
                <XCircle className="h-16 w-16 text-red-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {status === 'verifying' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
            <CardDescription>
              {message || 'Please wait while we verify your email address'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'success' && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  You will be redirected to the login page in a few seconds...
                </p>
                <Button onClick={() => navigate('/login')} className="w-full">
                  Go to Login
                </Button>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/login')} 
                  className="w-full"
                  variant="outline"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;

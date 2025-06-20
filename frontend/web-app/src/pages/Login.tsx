import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/contexts/language-context';
import LanguageSwitcher from '@/components/language/LanguageSwitcher';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

const formSchema = z.object({
  username: z.string().min(2, {
    message: 'Username must be at least 2 characters.',
  }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters.',
  }),
});

const Login = () => {
  const { login, doctorLogin, receptionistLogin, isLoading, error, clearError } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'receptionist' | 'admin'>('doctor');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    clearError?.();
    
    try {
      let success = false;
      
      switch (selectedRole) {
        case 'doctor':
          success = await doctorLogin(values.username, values.password);
          if (success) navigate('/doctor/dashboard');
          break;
          
        case 'receptionist':
          success = await receptionistLogin(values.username, values.password);
          if (success) navigate('/receptionist/dashboard');
          break;
          
        case 'admin':
          success = await login(values.username, values.password);
          if (success) navigate('/admin/dashboard');
          break;
          
        default:
          success = await login(values.username, values.password);
          if (success) navigate('/admin/dashboard');
      }
      
      if (success) {
        toast({
          title: "Login successful",
          description: `Welcome back, ${values.username}!`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-end">
            <LanguageSwitcher />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {t('login')}
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the hospital system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs 
            defaultValue="doctor" 
            className="mb-6"
            onValueChange={(value) => {
              setSelectedRole(value as 'doctor' | 'receptionist' | 'admin');
              clearError?.();
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="doctor">Doctor</TabsTrigger>
              <TabsTrigger value="receptionist">Receptionist</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
            <TabsContent value="doctor">
              <p className="text-sm text-gray-500 mt-2">
                Login as a doctor to manage your patient queue and consultations.
              </p>
            </TabsContent>
            <TabsContent value="receptionist">
              <p className="text-sm text-gray-500 mt-2">
                Login as a receptionist to register patients and manage the hospital queue.
              </p>
            </TabsContent>
            <TabsContent value="admin">
              <p className="text-sm text-gray-500 mt-2">
                Login as an administrator to access analytics, user management, and system settings.
              </p>
            </TabsContent>
          </Tabs>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('username')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={
                          selectedRole === 'doctor' 
                            ? "doctor" 
                            : selectedRole === 'receptionist'
                              ? "receptionist"
                              : "admin"
                        } 
                        {...field} 
                        disabled={isSubmitting || isLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('password')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••" 
                        {...field} 
                        disabled={isSubmitting || isLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button 
                  variant="link" 
                  className="p-0 h-auto" 
                  asChild
                >
                  <Link to="/forgot-password">{t('forgotPassword')}</Link>
                </Button>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={isSubmitting || isLoading}
              >
                {(isSubmitting || isLoading) ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    {t('loggingIn')}
                  </>
                ) : (
                  t('login')
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-500">
          <p className="w-full">
            {import.meta.env.DEV && (
              <>
                For demo purposes, use: <br />
                Doctor: username: doctor | password: password <br />
                Receptionist: username: receptionist | password: password <br />
                Admin: username: admin | password: admin123
              </>
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;

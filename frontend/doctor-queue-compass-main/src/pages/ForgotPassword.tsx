
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
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

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

const ForgotPassword = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // In a real app, this would call an API to send a password reset email
      // For now, we'll simulate a success response after a short delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      toast({
        title: t('success'),
        description: "If an account exists with that email, we've sent a password reset link.",
      });
      
      // Navigate back to login page
      navigate('/login');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast({
        title: t('error'),
        description: "Failed to send reset email. Please try again.",
        variant: 'destructive',
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
            {t('forgotPassword')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('enterEmail')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('email')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="doctor@hospital.com" 
                        {...field} 
                        disabled={isSubmitting} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    {t('loading')}
                  </>
                ) : (
                  t('sendResetLink')
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            variant="link" 
            onClick={() => navigate('/login')}
          >
            {t('login')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPassword;

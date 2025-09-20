import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, USER_ROLES, type InsertUser, type User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, UserCheck, UserX, Shield, Code, BarChart3 } from "lucide-react";
import { useUser } from "@/contexts/user-context";

export function AdminPanel() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  // Fetch all users
  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      return response.json();
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await apiRequest('POST', '/api/users', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowCreateDialog(false);
      toast({
        title: "User created",
        description: "New user has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: USER_ROLES.BUSINESS_USER,
      isActive: true,
    },
  });

  const onSubmit = (data: InsertUser) => {
    createUserMutation.mutate(data);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return <Shield className="h-4 w-4 text-red-500" />;
      case USER_ROLES.DEVELOPER:
        return <Code className="h-4 w-4 text-blue-500" />;
      case USER_ROLES.BUSINESS_USER:
        return <BarChart3 className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return "destructive";
      case USER_ROLES.DEVELOPER:
        return "default";
      case USER_ROLES.BUSINESS_USER:
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatRole = (role: string) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return "Admin";
      case USER_ROLES.DEVELOPER:
        return "Developer";
      case USER_ROLES.BUSINESS_USER:
        return "Business User";
      default:
        return role;
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-admin-error">
        <AlertDescription>Failed to load users. {error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-panel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage user accounts and assign roles
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-user">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user account and assign their role
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter username"
                          data-testid="input-new-username"
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Enter password (min 6 characters)"
                          data-testid="input-new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          data-testid="select-user-role"
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={USER_ROLES.ADMIN}>
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-red-500" />
                                Admin - Full access
                              </div>
                            </SelectItem>
                            <SelectItem value={USER_ROLES.DEVELOPER}>
                              <div className="flex items-center gap-2">
                                <Code className="h-4 w-4 text-blue-500" />
                                Developer - Query & manage connections
                              </div>
                            </SelectItem>
                            <SelectItem value={USER_ROLES.BUSINESS_USER}>
                              <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-green-500" />
                                Business User - Read-only queries
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users ({users.length})
          </CardTitle>
          <CardDescription>
            Current user accounts and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`user-item-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(user.role) as any}>
                        {formatRole(user.role)}
                      </Badge>
                      {user.isActive ? (
                        <Badge variant="outline" className="text-green-600">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          <UserX className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      {user.id === currentUser?.id && (
                        <Badge variant="outline" className="text-blue-600">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {user.id !== currentUser?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteUserMutation.mutate(user.id)}
                      disabled={deleteUserMutation.isPending}
                      data-testid={`button-delete-user-${user.id}`}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
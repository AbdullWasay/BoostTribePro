import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Shield, User, CreditCard, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserManagement = () => {
    const { t } = useTranslation();
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API}/admin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error(t('superadmin.users.updateError'));
        } finally {
            setLoading(false);
        }
    };

    const updateUser = async (userId, data) => {
        try {
            await axios.put(`${API}/admin/users/${userId}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(t('superadmin.users.updateSuccess'));
            fetchUsers();
        } catch (error) {
            toast.error(t('superadmin.users.updateError'));
        }
    };

    const deleteUser = async (userId) => {
        if (!window.confirm(t('superadmin.users.deleteConfirm'))) return;
        try {
            await axios.delete(`${API}/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(t('superadmin.users.deleteSuccess'));
            fetchUsers();
        } catch (error) {
            toast.error(t('superadmin.users.deleteError'));
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">{t('superadmin.users.loading')}</div>;

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-primary/20 glass overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>{t('superadmin.users.user')}</TableHead>
                            <TableHead>{t('superadmin.users.role')}</TableHead>
                            <TableHead>{t('superadmin.users.plan')}</TableHead>
                            <TableHead>{t('superadmin.users.joined')}</TableHead>
                            <TableHead className="text-right">{t('superadmin.users.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} className="hover:bg-muted/30">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-white">{user.name}</span>
                                        <span className="text-xs text-gray-400">{user.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.role === 'superadmin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={user.plan === 'pro' ? 'bg-primary' : 'bg-gray-500'}>
                                        {user.plan}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-gray-400 text-sm">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="glass border-primary/20">
                                            <DropdownMenuItem onClick={() => updateUser(user.id, { role: user.role === 'admin' ? 'user' : 'admin' })}>
                                                <Shield className="mr-2 h-4 w-4" />
                                                {user.role === 'admin' ? t('superadmin.users.demoteAdmin') : t('superadmin.users.promoteAdmin')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateUser(user.id, { plan: user.plan === 'pro' ? 'free' : 'pro' })}>
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                {user.plan === 'pro' ? t('superadmin.users.downgradeFree') : t('superadmin.users.upgradePro')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-500 hover:text-red-400" onClick={() => deleteUser(user.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {t('superadmin.users.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default UserManagement;

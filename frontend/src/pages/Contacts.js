import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Upload, Download, Search, Edit, Trash2, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Contacts = () => {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // Nouveau filtre
  const [selectedContacts, setSelectedContacts] = useState([]); // Sélection multiple
  const [showBulkMessageDialog, setShowBulkMessageDialog] = useState(false); // Dialog message groupé
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkChannel, setBulkChannel] = useState('email');
  const [contactsStats, setContactsStats] = useState(null); // Stats des contacts
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  const [customGroups, setCustomGroups] = useState([]); // Groupes personnalisés
  const [showGroupDialog, setShowGroupDialog] = useState(false); // Dialog gestion des groupes
  const [newGroupName, setNewGroupName] = useState(''); // Nom du nouveau groupe
  const [editingGroupId, setEditingGroupId] = useState(null); // ID du groupe en cours d'édition
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '', // Nouveau champ
    group: 'general',
    tags: '',
    active: true,
    subscription_status: 'non-subscriber', // Nouveau champ
    membership_type: '', // Nouveau champ
    notes: '' // Nouveau champ
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchContacts();
    fetchContactsStats();
    fetchCustomGroups();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchQuery, selectedGroup, selectedStatus]);

  const fetchContactsStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/contacts/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContactsStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCustomGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/contact-groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomGroups(response.data);
    } catch (error) {
      console.error('Error fetching custom groups:', error);
    }
  };

  const createCustomGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error(t('contacts.groupNameRequired'));
      return;
    }

    const groupNameToCreate = newGroupName.trim();
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/contact-groups`,
        { name: groupNameToCreate, color: '#8B5CF6' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Check response status explicitly
      if (response && (response.status === 200 || response.status === 201)) {
        toast.success(t('contacts.groupCreated'));
        setNewGroupName('');
        // Fetch groups in the background - don't await to avoid blocking
        fetchCustomGroups().catch(err => {
          console.error('Error refreshing groups after creation:', err);
          // Don't show error to user since group was created successfully
        });
      } else {
        // Unexpected response status
        toast.error(t('contacts.errorCreatingGroup'));
      }
    } catch (error) {
      // Only show error if we got an error response from server (4xx, 5xx)
      if (error.response && error.response.status >= 400) {
        const errorMessage = error.response?.data?.detail || error.response?.data?.message || t('contacts.errorCreatingGroup');
        toast.error(errorMessage);
      } else if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        // Network/timeout error - group might have been created, so refresh and show success
        console.warn('Network error during group creation, refreshing groups:', error);
        setNewGroupName('');
        fetchCustomGroups().catch(err => console.error('Error refreshing groups:', err));
        toast.success(t('contacts.groupCreated'));
      } else {
        // Other error
        console.error('Error creating group:', error);
        toast.error(t('contacts.errorCreatingGroup'));
      }
    }
  };

  const updateCustomGroup = async (groupId, newName) => {
    if (!newName.trim()) {
      toast.error(t('contacts.groupNameRequired'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/contact-groups/${groupId}`,
        { name: newName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t('contacts.groupRenamed'));
      setEditingGroupId(null);
      fetchCustomGroups();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('contacts.errorUpdatingGroup'));
    }
  };

  const deleteCustomGroup = async (groupId) => {
    if (!confirm(t('contacts.confirmDeleteGroup'))) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/contact-groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('contacts.groupDeleted'));
      fetchCustomGroups();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('contacts.errorDeletingGroup'));
    }
  };

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error(t('contacts.errorLoadingContacts'));
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    if (searchQuery) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedGroup !== 'all') {
      filtered = filtered.filter(contact => contact.group === selectedGroup);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(contact => contact.subscription_status === selectedStatus);
    }

    setFilteredContacts(filtered);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      };
      await axios.post(`${API}/contacts`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('contacts.contactAdded'));
      setShowAddDialog(false);
      resetForm();
      fetchContacts();
      fetchContactsStats();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error(error.response?.data?.detail || t('contacts.errorAddingContact'));
    }
  };

  const handleEditContact = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      };
      await axios.put(`${API}/contacts/${currentContact.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('contacts.contactUpdated'));
      setShowEditDialog(false);
      resetForm();
      fetchContacts();
      fetchContactsStats();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error(t('contacts.errorUpdatingContact'));
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm(t('contacts.confirmDeleteContact'))) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('contacts.contactDeleted'));
      fetchContacts();
      fetchContactsStats();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error(t('contacts.errorDeletingContact'));
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/contacts/import`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success(t('contacts.contactsImported', { 
        imported: response.data.imported, 
        duplicates: response.data.duplicates, 
        errors: response.data.errors 
      }));
      fetchContacts();
      fetchContactsStats();
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast.error(error.response?.data?.detail || t('contacts.errorImporting'));
    }
    // Reset file input
    e.target.value = '';
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(t('contacts.confirmBulkDelete'))) {
      return;
    }
    
    // Double confirmation
    if (!window.confirm(t('contacts.confirmBulkDeleteFinal'))) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API}/contacts/bulk-delete`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchContacts();
      fetchContactsStats();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast.error(t('contacts.errorDeleting'));
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/contacts/export/csv`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contacts.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t('contacts.contactsExported'));
    } catch (error) {
      console.error('Error exporting contacts:', error);
      toast.error(t('contacts.errorExporting'));
    }
  };

  const openEditDialog = (contact) => {
    setCurrentContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      group: contact.group,
      tags: contact.tags.join(', '),
      active: contact.active
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      group: 'general',
      tags: '',
      active: true,
      subscription_status: 'non-subscriber',
      membership_type: '',
      notes: ''
    });
    setCurrentContact(null);
  };

  // Nouvelles fonctions pour la gestion avancée
  const handleSelectContact = (contactId) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const handleSendBulkMessage = async () => {
    if (selectedContacts.length === 0) {
      toast.error(t('contacts.noContactSelected'));
      return;
    }

    if (!bulkMessage.trim()) {
      toast.error(t('contacts.messageCannotBeEmpty'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/contacts/bulk-message`,
        {
          contact_ids: selectedContacts,
          message: bulkMessage,
          channel: bulkChannel
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t('contacts.messageSent', { count: selectedContacts.length }));
      setShowBulkMessageDialog(false);
      setBulkMessage('');
      setSelectedContacts([]);
    } catch (error) {
      console.error('Error sending bulk message:', error);
      toast.error(error.response?.data?.detail || t('contacts.errorSendingMessages'));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { label: t('contacts.statusLabels.active'), color: 'bg-green-500' },
      'non-subscriber': { label: t('contacts.statusLabels.nonSubscriber'), color: 'bg-gray-500' },
      'trial': { label: t('contacts.statusLabels.trial'), color: 'bg-blue-500' },
      'expired': { label: t('contacts.statusLabels.expired'), color: 'bg-red-500' }
    };
    const badge = badges[status] || badges['non-subscriber'];
    return (
      <Badge className={`${badge.color} text-white`}>
        {badge.label}
      </Badge>
    );
  };

  const groups = ['all', ...new Set(contacts.map(c => c.group))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="contacts-loading">
        <div className="text-2xl text-primary animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6" data-testid="contacts-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2" data-testid="contacts-title">{t('contacts.title')}</h1>
          <p className="text-sm sm:text-base text-gray-400">
            {contacts.length} contacts
            {selectedContacts.length > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({selectedContacts.length} sélectionné{selectedContacts.length > 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-primary hover:bg-primary/90 glow"
            size="sm"
            data-testid="add-contact-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('contacts.addContact')}
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
            data-testid="import-contacts-button"
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('contacts.importContacts')}
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={contacts.length === 0}
            size="sm"
            data-testid="export-contacts-button"
          >
            <Download className="mr-2 h-4 w-4" />
            {t('contacts.exportContacts')}
          </Button>
          <Button
            onClick={handleBulkDelete}
            variant="destructive"
            disabled={contacts.length === 0}
            className="text-red-500 hover:bg-red-500/10"
            size="sm"
            data-testid="bulk-delete-contacts-button"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('contacts.deleteAll')}
          </Button>
          <Button
            onClick={() => setShowGroupDialog(true)}
            variant="outline"
            className="border-primary/50"
            size="sm"
            data-testid="manage-groups-button"
          >
            <Edit className="mr-2 h-4 w-4" />
            {t('contacts.manageGroups')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Stats Cards */}
      {contactsStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gradient">{contactsStats.total}</div>
              <div className="text-sm text-gray-400">{t('contacts.totalContacts')}</div>
            </CardContent>
          </Card>
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{contactsStats.subscribers}</div>
              <div className="text-sm text-gray-400">{t('contacts.subscribers')}</div>
            </CardContent>
          </Card>
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-500">{contactsStats.non_subscribers}</div>
              <div className="text-sm text-gray-400">{t('contacts.nonSubscribers')}</div>
            </CardContent>
          </Card>
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{contactsStats.trial}</div>
              <div className="text-sm text-gray-400">{t('contacts.trial')}</div>
            </CardContent>
          </Card>
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{contactsStats.expired}</div>
              <div className="text-sm text-gray-400">{t('contacts.expired')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="glass border-primary/20">
        <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('contacts.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-contacts-input"
                />
              </div>
            </div>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-full md:w-48 flex-shrink-0" data-testid="filter-group-select">
                <SelectValue placeholder={t('contacts.filterByGroup')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="group-all">{t('contacts.allGroups')}</SelectItem>
                {groups.filter(g => g !== 'all').map(group => (
                  <SelectItem key={group} value={group} data-testid={`group-${group}`}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-48 flex-shrink-0" data-testid="filter-status-select">
                <SelectValue placeholder={t('contacts.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('contacts.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('contacts.subscribers')}</SelectItem>
                <SelectItem value="non-subscriber">{t('contacts.nonSubscribers')}</SelectItem>
                <SelectItem value="trial">{t('contacts.trial')}</SelectItem>
                <SelectItem value="expired">{t('contacts.expired')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedContacts.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-primary/10 rounded-lg border border-primary/30">
                <span className="text-sm font-medium whitespace-nowrap">
                ✓ {selectedContacts.length} {selectedContacts.length === 1 ? t('contacts.contacts') : t('contacts.contacts')} {selectedContacts.length === 1 ? t('contacts.selected') : t('contacts.selectedPlural')}
              </span>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setShowBulkMessageDialog(true)}
                  className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                  size="sm"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <span className="whitespace-nowrap">{t('contacts.sendMessageButton')}</span>
                </Button>
                <Button
                  onClick={async () => {
                    if (!window.confirm(t('contacts.confirmDeleteSelection', { count: selectedContacts.length }))) {
                      return;
                    }
                    try {
                      const token = localStorage.getItem('token');
                      for (const contactId of selectedContacts) {
                        await axios.delete(`${API}/contacts/${contactId}`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                      }
                      toast.success(t('contacts.selectionDeleted', { count: selectedContacts.length }));
                      setSelectedContacts([]);
                      fetchContacts();
                      fetchContactsStats();
                    } catch (error) {
                      toast.error(t('contacts.errorDeleting'));
                    }
                  }}
                  variant="destructive"
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 w-full sm:w-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span className="whitespace-nowrap">{t('contacts.deleteSelection')}</span>
                </Button>
                <Button
                  onClick={() => setSelectedContacts([])}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  <span className="whitespace-nowrap">{t('contacts.deselect')}</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card className="glass border-primary/20">
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full divide-y divide-primary/20" data-testid="contacts-table">
              <thead>
                <tr className="border-b border-primary/20">
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-primary bg-background checked:bg-primary checked:border-primary cursor-pointer"
                      title={t('contacts.selectAll')}
                    />
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400">{t('contacts.name')}</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400 hidden md:table-cell">{t('contacts.email')}</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400 hidden lg:table-cell">{t('contacts.phone')}</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400 hidden sm:table-cell">{t('contacts.group')}</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400">{t('contacts.status')}</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400 hidden lg:table-cell">{t('contacts.tags')}</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-medium text-gray-400">{t('contacts.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact, index) => (
                  <tr
                    key={contact.id}
                    className="border-b border-primary/10 hover:bg-muted/30 transition-colors cursor-pointer"
                    data-testid={`contact-row-${index}`}
                    onClick={() => {
                      setSelectedContacts([contact.id]);
                      setBulkChannel('whatsapp');
                      setShowBulkMessageDialog(true);
                    }}
                  >
                    <td className="px-3 sm:px-6 py-3 sm:py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => handleSelectContact(contact.id)}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-primary bg-background checked:bg-primary checked:border-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-white">
                      <div className="flex flex-col">
                        <span>{contact.name}</span>
                        <span className="text-xs text-gray-400 md:hidden mt-0.5">{contact.email}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-300 hidden md:table-cell">{contact.email}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-300 hidden lg:table-cell">{contact.phone || '-'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm hidden sm:table-cell">
                      <Badge variant="outline" className="border-primary/30 text-xs">{contact.group}</Badge>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                      {getStatusBadge(contact.subscription_status || 'non-subscriber')}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                        {contact.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">+{contact.tags.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedContacts([contact.id]);
                            setBulkChannel('whatsapp');
                            setShowBulkMessageDialog(true);
                          }}
                          className="text-green-500 hover:text-green-400"
                          title={t('contacts.sendWhatsApp')}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(contact)}
                          data-testid={`edit-contact-${index}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-500 hover:text-red-400"
                          data-testid={`delete-contact-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {filteredContacts.length === 0 && (
              <div className="text-center py-12 text-gray-400 px-4" data-testid="no-contacts-message">
                {t('contacts.noContactsFound')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="glass" data-testid="add-contact-dialog">
          <DialogHeader>
            <DialogTitle>{t('contacts.addContact')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">{t('contacts.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="add-name-input"
                />
              </div>
              <div>
                <Label htmlFor="email">{t('contacts.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="add-email-input"
                />
              </div>
              <div>
                <Label htmlFor="phone">{t('contacts.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('contacts.phonePlaceholder')}
                  data-testid="add-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="subscription_status">{t('contacts.subscriptionStatus')}</Label>
                <Select
                  value={formData.subscription_status}
                  onValueChange={(value) => setFormData({ ...formData, subscription_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non-subscriber">{t('contacts.subscriptionStatusOptions.nonSubscriber')}</SelectItem>
                    <SelectItem value="active">{t('contacts.subscriptionStatusOptions.active')}</SelectItem>
                    <SelectItem value="trial">{t('contacts.subscriptionStatusOptions.trial')}</SelectItem>
                    <SelectItem value="expired">{t('contacts.subscriptionStatusOptions.expired')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="membership_type">{t('contacts.membershipType')}</Label>
                <Input
                  id="membership_type"
                  value={formData.membership_type}
                  onChange={(e) => setFormData({ ...formData, membership_type: e.target.value })}
                  placeholder="Standard, Premium, VIP..."
                  data-testid="add-membership-input"
                />
              </div>
              <div>
                <Label htmlFor="group">{t('contacts.group')}</Label>
                <select
                  id="group"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                  data-testid="add-group-select"
                >
                  <optgroup label="Groupes par défaut">
                    <option value="general">Général</option>
                    <option value="imported">Importé</option>
                    <option value="vip">VIP</option>
                    <option value="members">Membres</option>
                    <option value="prospects">Prospects</option>
                    <option value="inactive">Inactifs</option>
                  </optgroup>
                  {customGroups.length > 0 && (
                    <optgroup label="Groupes personnalisés">
                      {customGroups.map(group => (
                        <option key={group.id} value={group.name}>{group.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <Label htmlFor="tags">{t('contacts.tags')} ({t('contacts.tagsSeparatedByComma')})</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                  data-testid="add-tags-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="submit-add-contact">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="glass" data-testid="edit-contact-dialog">
          <DialogHeader>
            <DialogTitle>{t('contacts.editContact')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditContact}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">{t('contacts.name')}</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="edit-name-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">{t('contacts.email')}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="edit-email-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">{t('contacts.phone')}</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('contacts.phonePlaceholder')}
                  data-testid="edit-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-group">{t('contacts.group')}</Label>
                <select
                  id="edit-group"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                  data-testid="edit-group-select"
                >
                  <optgroup label={t('contacts.defaultGroups')}>
                    <option value="general">{t('contacts.general')}</option>
                    <option value="imported">{t('contacts.imported')}</option>
                    <option value="vip">{t('contacts.vip')}</option>
                    <option value="members">{t('contacts.members')}</option>
                    <option value="prospects">{t('contacts.prospects')}</option>
                    <option value="inactive">{t('contacts.inactive')}</option>
                  </optgroup>
                  {customGroups.length > 0 && (
                    <optgroup label={t('contacts.customGroups')}>
                      {customGroups.map(group => (
                        <option key={group.id} value={group.name}>{group.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-subscription-status">{t('contacts.subscriptionStatus')}</Label>
                <select
                  id="edit-subscription-status"
                  value={formData.subscription_status || 'non-subscriber'}
                  onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value })}
                  className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                  data-testid="edit-subscription-status-select"
                >
                  <option value="non-subscriber">{t('contacts.subscriptionStatusOptions.nonSubscriber')}</option>
                  <option value="active">{t('contacts.subscriptionStatusOptions.active')}</option>
                  <option value="trial">{t('contacts.subscriptionStatusOptions.trial')}</option>
                  <option value="expired">{t('contacts.subscriptionStatusOptions.expired')}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-tags">{t('contacts.tags')} ({t('contacts.tagsSeparatedByComma')})</Label>
                <Input
                  id="edit-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  data-testid="edit-tags-input"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded"
                  data-testid="edit-active-checkbox"
                />
                <Label htmlFor="edit-active">{t('contacts.active')}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="submit-edit-contact">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Message Dialog */}
      <Dialog open={showBulkMessageDialog} onOpenChange={setShowBulkMessageDialog}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>
              💬 {t('contacts.sendMessageTo', { count: selectedContacts.length })}
              {selectedContacts.length === 1 && contacts.find(c => c.id === selectedContacts[0]) && (
                <span className="text-sm font-normal text-gray-400 block mt-1">
                  → {contacts.find(c => c.id === selectedContacts[0]).name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bulk-channel">{t('contacts.channel')}</Label>
              <Select value={bulkChannel} onValueChange={setBulkChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bulk-message">{t('contacts.message')}</Label>
              <textarea
                id="bulk-message"
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder={bulkChannel === 'whatsapp' ? t('contacts.whatsappPlaceholder') : t('contacts.messagePlaceholder')}
                className="w-full min-h-[150px] p-3 rounded-md bg-background border border-primary/20 text-white"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                {bulkChannel === 'whatsapp' && t('contacts.simulationMode')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowBulkMessageDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSendBulkMessage} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              <MessageCircle className="mr-2 h-4 w-4" />
              {bulkChannel === 'whatsapp' ? t('contacts.sendWhatsApp') : t('contacts.sendEmail')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Groups Management Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('contacts.manageContactGroups')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add New Group */}
            <div className="flex gap-2">
              <Input
                placeholder={t('contacts.newGroupName')}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createCustomGroup()}
                className="flex-1"
              />
              <Button onClick={createCustomGroup} disabled={!newGroupName.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                {t('contacts.create')}
              </Button>
            </div>

            {/* Groups List */}
            <div className="border border-primary/20 rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
              {/* Default Groups (non-editable) */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">{t('contacts.defaultGroups')}</h3>
                {['general', 'imported', 'vip', 'members', 'prospects', 'inactive'].map(group => (
                  <div key={group} className="flex items-center justify-between p-2 bg-gray-800/50 rounded mb-1">
                    <span className="capitalize">{group === 'general' ? t('contacts.general') : group === 'imported' ? t('contacts.imported') : group === 'vip' ? t('contacts.vip') : group === 'members' ? t('contacts.members') : group === 'prospects' ? t('contacts.prospects') : t('contacts.inactive')}</span>
                    <Badge variant="outline" className="text-xs">{t('contacts.default')}</Badge>
                  </div>
                ))}
              </div>

              {/* Custom Groups (editable) */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">{t('contacts.customGroups')} ({customGroups.length})</h3>
                {customGroups.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">{t('contacts.noCustomGroups')}</p>
                ) : (
                  customGroups.map(group => (
                    <div key={group.id} className="flex items-center justify-between p-2 bg-primary/10 rounded mb-1 border border-primary/30">
                      {editingGroupId === group.id ? (
                        <>
                          <Input
                            defaultValue={group.name}
                            autoFocus
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateCustomGroup(group.id, e.target.value);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value.trim() !== group.name) {
                                updateCustomGroup(group.id, e.target.value);
                              } else {
                                setEditingGroupId(null);
                              }
                            }}
                            className="flex-1 mr-2"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingGroupId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span>{group.name}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingGroupId(group.id)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => deleteCustomGroup(group.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowGroupDialog(false)}>{t('contacts.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contacts;

import { MapPin, MapPinned, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AddressForm } from '../components/AddressForm.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/Feedback.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../services/api.js';

const BLANK_ADDRESS = { label: '', line1: '', city: '', state: '', postalCode: '' };

export function Addresses() {
  usePageTitle('Saved addresses');
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/addresses', { signal });
      setAddresses(data.addresses);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Could not load your addresses.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function startAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function startEdit(address) {
    setEditing(address);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function saveAddress(values) {
    setSaving(true);
    try {
      if (editing) {
        const data = await api.patch(`/addresses/${editing.id}`, values);
        setAddresses((current) =>
          current.map((address) => (address.id === editing.id ? data.address : address)),
        );
        toast.success('Address updated.');
      } else {
        const data = await api.post('/addresses', values);
        setAddresses((current) => [...current, data.address]);
        toast.success('Address added.');
      }
      cancelForm();
    } catch (err) {
      toast.error(err.message || 'Could not save that address.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteAddress() {
    if (!addressToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/addresses/${addressToDelete.id}`);
      setAddresses((current) => current.filter((address) => address.id !== addressToDelete.id));
      if (editing?.id === addressToDelete.id) cancelForm();
      toast.success('Address deleted.');
      setAddressToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Could not delete that address.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Delivery details</p>
          <h1 className="mt-1 font-display text-4xl font-bold text-ink-950">Saved addresses</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-500">
            Keep the places you order to handy. Each order keeps its own address snapshot, so
            editing an address never changes an order that was already placed.
          </p>
        </div>
        {!showForm ? (
          <button type="button" onClick={startAdd} className="btn-primary">
            <Plus size={16} /> Add address
          </button>
        ) : null}
      </div>

      {showForm ? (
        <section className="surface mt-6 p-6">
          <h2 className="font-display text-2xl font-bold text-ink-950">
            {editing ? 'Edit address' : 'New address'}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            {editing
              ? 'Update the details below. Existing orders keep their original snapshot.'
              : 'Use a label like Home or Work so it is easy to spot at checkout.'}
          </p>
          <div className="mt-5">
            <AddressForm
              initial={editing || BLANK_ADDRESS}
              onSubmit={saveAddress}
              onCancel={cancelForm}
              busy={saving}
              submitLabel={editing ? 'Save changes' : 'Add address'}
            />
          </div>
        </section>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <PageLoader label="Loading your addresses…" />
        ) : error ? (
          <ErrorState title="Addresses did not load" message={error} onRetry={() => void load()} />
        ) : addresses.length === 0 ? (
          <EmptyState
            icon={MapPinned}
            title="No saved addresses yet"
            description="Add a delivery address now, or create one during checkout. You can edit or remove it at any time."
            action={
              !showForm ? (
                <button type="button" onClick={startAdd} className="btn-primary">
                  <Plus size={16} /> Add your first address
                </button>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {addresses.map((address) => (
              <article key={address.id} className="surface flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <MapPin size={19} />
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(address)}
                      aria-label={`Edit ${address.label || 'address'}`}
                      className="rounded-full p-2 text-ink-500 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressToDelete(address)}
                      aria-label={`Delete ${address.label || 'address'}`}
                      className="rounded-full p-2 text-ink-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h2 className="mt-4 font-display text-xl font-bold text-ink-950">
                  {address.label || 'Saved address'}
                </h2>
                <p className="mt-1.5 flex-1 text-sm leading-6 text-ink-500">
                  {address.line1}
                  <br />
                  {address.city}, {address.state}
                  <br />
                  {address.postalCode}
                </p>
                <button
                  type="button"
                  onClick={() => startEdit(address)}
                  className="mt-4 w-fit text-xs font-extrabold text-brand-700 hover:underline"
                >
                  Edit this address
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(addressToDelete)}
        title="Delete this address?"
        message={`${
          addressToDelete?.label
            ? `Your “${addressToDelete.label}” address`
            : 'This address'
        } will be removed from your saved list. Orders that already used it are unchanged.`}
        confirmLabel="Delete address"
        cancelLabel="Keep it"
        onConfirm={deleteAddress}
        onCancel={() => setAddressToDelete(null)}
        busy={deleting}
        danger
      />
    </div>
  );
}

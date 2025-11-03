import { AddAccountDialog } from '../add-account-dialog';

export default function AddAccountDialogExample() {
  return (
    <div className="p-6">
      <AddAccountDialog onAdd={(account) => console.log('Account added:', account)} />
    </div>
  );
}

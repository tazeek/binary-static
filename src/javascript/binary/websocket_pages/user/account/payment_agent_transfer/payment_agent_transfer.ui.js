const localize = require('../../../../base/localize').localize;

const PaymentAgentTransferUI = (() => {
    'use strict';

    let $paymentagent_transfer,
        $confirm_transfer,
        $done_transfer,
        $notes_transfer;

    const initValues = () => {
        $paymentagent_transfer = $('#frm_paymentagent_transfer');
        $confirm_transfer = $('#frm_confirm_transfer');
        $done_transfer = $('#pa_transfer_done');
        $notes_transfer = $('#paymentagent_transfer_notes');
    };

    const hideForm = () => { $paymentagent_transfer.setVisibility(0); };

    const showForm = () => { $paymentagent_transfer.setVisibility(1); };

    const hideConfirmation = () => { $confirm_transfer.setVisibility(0); };

    const showConfirmation = () => { $confirm_transfer.find('.errorfield').setVisibility(0).end().setVisibility(1); };

    const hideDone = () => { $done_transfer.setVisibility(0); };

    const showDone = () => { $done_transfer.setVisibility(1); };

    const hideNotes = () => { $notes_transfer.setVisibility(0); };

    const showNotes = () => { $notes_transfer.setVisibility(1); };

    const showTransferError = (err) => { $confirm_transfer.find('.errorfield').text(localize(err)).setVisibility(1); };

    const updateFormView = (currency) => { $paymentagent_transfer.find('label[for="amount"]').text(`${localize('Amount')} ${currency}`); };

    const updateConfirmView = (username, loginid, amount, currency) => {
        $confirm_transfer
            .find('#user_name')
                .empty()
                .text(username)
            .end()
            .find('#loginid')
                .empty()
                .text(loginid)
            .end()
            .find('#confirm_amount')
                .empty()
                .text(`${currency} ${amount}`);
    };

    const updateDoneView = (from_id, to_id, amount, currency) => {
        const template_string = 'Your request to transfer [_1] [_2] from [_3] to [_4] has been successfully processed.';
        const confirm_msg = localize(template_string, [
            amount,
            currency,
            from_id,
            to_id,
        ]);
        $done_transfer.find(' > #confirm_msg').text(confirm_msg).setVisibility(1);
    };

    const hideFirstForm = () => {
        hideForm();
        hideConfirmation();
        hideNotes();
    };

    return {
        initValues       : initValues,
        hideForm         : hideForm,
        showForm         : showForm,
        hideConfirmation : hideConfirmation,
        showConfirmation : showConfirmation,
        hideDone         : hideDone,
        showDone         : showDone,
        hideNotes        : hideNotes,
        showNotes        : showNotes,
        showTransferError: showTransferError,
        updateFormView   : updateFormView,
        updateConfirmView: updateConfirmView,
        updateDoneView   : updateDoneView,
        hideFirstForm    : hideFirstForm,
    };
})();

module.exports = PaymentAgentTransferUI;

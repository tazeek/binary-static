const moment               = require('moment');
const StatementUI          = require('./statement.ui');
const ViewPopup            = require('../../view_popup/view_popup');
const BinarySocket         = require('../../../socket');
const getLanguage          = require('../../../../base/language').get;
const localize             = require('../../../../base/localize').localize;
const showLocalTimeOnHover = require('../../../../base/clock').showLocalTimeOnHover;
const addTooltip           = require('../../../../common_functions/get_app_details').addTooltip;
const buildOauthApps       = require('../../../../common_functions/get_app_details').buildOauthApps;
const dateValueChanged     = require('../../../../common_functions/common_functions').dateValueChanged;
const jpClient             = require('../../../../common_functions/country_base').jpClient;
const toISOFormat          = require('../../../../common_functions/string_util').toISOFormat;
const DatePicker           = require('../../../../components/date_picker');

const StatementInit = (() => {
    'use strict';

    // Batch refer to number of data get from ws service per request
    // chunk refer to number of data populate to ui for each append
    // receive means receive from ws service
    // consume means consume by UI and displayed to page

    let batch_size,
        chunk_size,
        no_more_data,
        pending,
        current_batch,
        transactions_received,
        transactions_consumed;

    let action_list = [];

    const tableExist = () => (document.getElementById('statement-table'));

    const finishedConsumed = () => (transactions_consumed === transactions_received);

    const getStatement = (opts) => {
        const req = { statement: 1, description: 1 };

        if (opts) $.extend(true, req, opts);

        const jump_to_val = $('#jump-to').attr('data-value');
        if (jump_to_val && jump_to_val !== '') {
            req.date_to = moment.utc(jump_to_val).unix() + ((jpClient() ? 15 : 24) * (60 * 60));
            req.date_from = 0;
        }
        BinarySocket.send(req).then((response) => {
            statementHandler(response);
        });
    };

    const getNextBatchStatement = () => {
        getStatement({ offset: transactions_received, limit: batch_size });
        pending = true;
    };

    const getNextChunkStatement = () => {
        const chunk = current_batch.splice(0, chunk_size);
        transactions_consumed += chunk.length;
        $('#rows_count').text(transactions_consumed);
        return chunk;
    };

    const statementHandler = (response) => {
        if (response.error) {
            StatementUI.errorMessage(response.error.message);
            return;
        }

        pending = false;

        const statement = response.statement;
        current_batch = statement.transactions;
        transactions_received += current_batch.length;

        if (current_batch.length < batch_size) {
            no_more_data = true;
        }

        if (!tableExist()) {
            const $header = StatementUI.createEmptyStatementTable();
            headerEventHandler();
            $header.appendTo('#statement-container');
            $('#statement-container').css('padding-left', '2%');
            $('#statement-container').css('padding-right', '2%');
            $('.act, .credit').addClass('nowrap');
            StatementUI.updateStatementTable(getNextChunkStatement());

            // Show a message when the table is empty
            if (transactions_received === 0 && current_batch.length === 0) {
                $('#statement-table').find('tbody')
                    .append($('<tr/>', { class: 'flex-tr' })
                        .append($('<td/>', { colspan: 7 })
                            .append($('<p/>', { class: 'notice-msg center-text', text: localize('Your account has no trading activity.') }))));
            } else {
                $('#util_row').setVisibility(1);
                if (getLanguage() === 'JA') {
                    $('#download_csv').setVisibility(1)
                                      .find('a')
                                      .unbind('click')
                                      .click(() => { StatementUI.exportCSV(); });
                }
            }
            updateActionList();
        }

        showLocalTimeOnHover('td.date');
    };

    const updateActionList = () => {
        const temp = [];
        $('#statement-table > tbody > tr').each(function () {
            const action = String($(this).find('.act').html());
            if (action_list.indexOf(action) === -1 && temp.indexOf(action) === -1 && action !== 'undefined') {
                temp.push(action);
            }
        });
        $.each(temp, function(i, action) {
            $('#action-list').append($('<option>', {
                value: action.toLowerCase(),
                text : localize(action),
            }));
        });
        action_list = action_list.concat(temp);
    };

    const headerEventHandler = () => {
        $(document.body).find('#reference-input').on('keyup', function() {
            filterTable();
        });
        $(document.body).find('#debit-credit-list').on('change', function() {
            filterTable();
        });
        $(document.body).find('#action-list').on('change', function() {
            filterTable();
        });
    };

    const filterTable = () => {
        let foundRow = false;
        const input_ref = $('#reference-input').val();
        const input_selected = $('#debit-credit-list').val();
        const input_action = $('#action-list').val();
        $('#statement-table > tbody > tr').each(function () {
            const ref_id = $(this).find('.ref > span').html();
            const profit_loss_class = $(this).find('.credit').attr('class');
            const action = $(this).find('.act').html();
            if ($(this).attr('class').indexOf('details') > -1 && findRef(input_ref, ref_id) &&
            findPL(input_selected, profit_loss_class) && findAction(input_action, action)) {
                $(this).css('display', '');
                foundRow = true;
            } else {
                $(this).css('display', 'none');
            }
        });
        if (!foundRow) {
            if ($('.no-record')) {
                $('#statement-table').find('tbody').append($('<tr/>', { class: 'flex-tr' })
                    .append($('<td/>', { colspan: 7 })
                        .append($('<p/>', { class: 'no-record center-text', text: localize('No Search Results found.') }))));
            }

            $('flex-tr').css('display', '');
        } else {
            $('flex-tr').css('display', 'none');
        }
    };

    const findRef = (input_ref, ref_id) => {
        if (ref_id.indexOf(input_ref) > -1) {
            return true;
        }
        return false;
    };

    const findPL = (input_selected, profit_loss_class) => {
        if (profit_loss_class.indexOf(input_selected) > -1 || input_selected === 'all') {
            return true;
        }
        return false;
    };

    const findAction = (input_action, action) => {
        if (action.toLowerCase() === input_action || input_action === 'all') {
            return true;
        }
        return false;
    };

    const loadStatementChunkWhenScroll = () => {
        $(document).scroll(() => {
            const hidableHeight = (percentage) => {
                const total_hideable = $(document).height() - $(window).height();
                return Math.floor((total_hideable * percentage) / 100);
            };

            const p_from_top = $(document).scrollTop();

            if (!tableExist() || p_from_top < hidableHeight(70)) return;

            if (finishedConsumed() && !no_more_data && !pending) {
                getNextBatchStatement();
                return;
            }

            if (!finishedConsumed()) StatementUI.updateStatementTable(getNextChunkStatement());
            filterTable();
            updateActionList();
        });
    };

    const onUnload = () => {
        pending = false;
        no_more_data = false;

        current_batch = [];

        transactions_received = 0;
        transactions_consumed = 0;

        StatementUI.errorMessage(null);
        StatementUI.clearTableContent();
    };

    const initPage = () => {
        batch_size = 20;
        chunk_size = batch_size / 2;
        no_more_data = false;
        pending = false;            // serve as a lock to prevent ws request is sequential
        current_batch = [];
        transactions_received = 0;
        transactions_consumed = 0;

        BinarySocket.send({ oauth_apps: 1 }).then((response) => {
            addTooltip(StatementUI.setOauthApps(buildOauthApps(response)));
            $('.barspinner').setVisibility(0);
        });
        getNextBatchStatement();
        loadStatementChunkWhenScroll();
    };

    const attachDatePicker = () => {
        const jump_to = '#jump-to';
        $(jump_to).attr('data-value', toISOFormat(moment()))
             .change(function() {
                 if (!dateValueChanged(this, 'date')) {
                     return false;
                 }
                 $('.table-container').remove();
                 StatementUI.clearTableContent();
                 initPage();
                 return true;
             });
        DatePicker.init({
            selector: jump_to,
            maxDate : 0,
        });
        if ($(jump_to).attr('data-picker') !== 'native') $(jump_to).val(localize('Today'));
    };

    const onLoad = () => {
        initPage();
        attachDatePicker();
        ViewPopup.viewOnClick('#statement-container');
    };

    return {
        init            : initPage,
        statementHandler: statementHandler,
        onLoad          : onLoad,
        onUnload        : onUnload,
    };
})();

module.exports = StatementInit;

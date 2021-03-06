// https://zer0.degree/chapter1/JavaScript-closure-and-design-patterns.html
var WoutState = /*(*/function () {

    var chkpoint_id = +$('#chkpoint_id').val();
    var card_categ_P_id = +$('#card_categ_P_id').val();
    var card_categ_L_id = +$('#card_categ_L_id').val();

    var cards_in = [];
    var card_workstation = null;
    var quality_id = +$('#quality_select').val();
    /* var last_weight = 0; */

    var info = function (message, level) {
        show_info(message, level);
        // TODO more suff?
    }

    var currentLotId = function () {
        return (
            cards_in.length > 0 ?
            cards_in[0].win_lot_id :
            ''
        );
    }

    var inputCount = function () {
        return cards_in.length;
    }

    var isOneInput = function () {
        return $('#one_input_button').hasClass('enabled');
    }

    var addCard = function (card_data) {

        // 0.- If is first read, we must clear screen (that is currently showing last operation data)
        check_reset_screen();

        // 1.- Check card_categ
        console.log('Checking card category ' + card_data.card_categ_id + '...');
        // 2.- Check data saving

        if ( card_data.card_categ_id === card_categ_P_id ) {
            // Product card received
            if ( inputCount() === 2 ) {
                // Too many product cards
                throw new Error(
                    $('#t_chkpoint_wout_input_workstation_expected_err').html()
                        .format(card_data.card_code)
                );
            }
            if ( (inputCount() === 1) && isOneInput() ) {
                // Second input card when one input mode is set
                throw new Error(
                    $('#t_chkpoint_wout_input_one_input_already_selected_err').html()
                        .format(card_data.card_code)
                );
            }
            if ( (inputCount() === 1) && (card_data.card_code === cards_in[0].card_code) ) {
                // Repeated card
                throw new Error(
                    $('#t_chkpoint_wout_input_repeated_err').html()
                        .format(card_data.card_code)
                );
            }
            if ( !('win_weight' in card_data) ) {
                throw new Error(
                    $('#t_chkpoint_wout_input_no_input_err').html()
                        .format(card_data.card_code)
                );
            }
            var lotId = currentLotId();
            if ( lotId && (lotId != card_data.win_lot_id) ) {
                throw new Error(
                    $('#t_chkpoint_wout_input_lot_err').html()
                        .format(card_data.card_code, card_data.win_lot_name)
               );
            }

            // Product card is allowed
            cards_in.push(card_data);
            // - Too late for set one input mode
            if  ( cards_in.length == 2 ) {
                $('#one_input_button').prop('disabled', true);
            }

            $('#lot').html(card_data.win_lot_name);
            $('#card_in_' + cards_in.length).val('{0} {1}'.format(card_data.win_weight, card_data.win_uom));

            info(`Added product Card #${card_data.card_code}`, 'ok');
        }
        else if ( card_data.card_categ_id === card_categ_L_id ) {
            // Workstation card received
            if ( cards_in.length === 0 ) {
                // Workstation card is not allowed
                throw new Error(
                    $('#t_chkpoint_wout_workstation_input_expected_err').html()
                        .format(card_data.card_code)
                );
            }

            if ( !('workstation' in card_data) ) {
                throw new Error(
                    $('#t_chkpoint_wout_workstation_no_workstation_err').html()
                        .format(card_data.card_code)
                );
            }

            // Workstation card is allowed: fire saving data
            card_workstation = card_data;
            $('#card_workstation').val(card_data.workstation);
            $('#last_quality').val($('#quality_select option:selected').text().trim());
            console.log(`Added workstation Card #${card_data.card_code}. Saving...`)
            save();
            return;
        }
        else {
            throw new Error(
                $('#t_chkpoint_wout_invalid_card_err').html()
                    .format(card_data.card_code)
            );
        }

    }

    var updateQuality = function () {
        quality_id = $('#quality_select').val();
    }

    var save = function () {

        $.ajax({
            url: '/mdc/cp/wout/' + chkpoint_id + '/save',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                cards_in: cards_in,
                card_workstation: card_workstation,
                quality_id: quality_id/*,
                wout_categ_id: ... */
            })
        }).done(function (data) {
            try {
                console.log(data.result);
                if ( data.result.err ) {
                    throw new Error('ERROR saving data: ' + data.result.err);
                }
                else {
                    displayUpdate(data.result);
                    reset();
                    return;
                }
            }
            catch (e) {
                info(e.message, 'err')
                reset();
            }
        }).fail(function () {
            info('ERROR saving data (unknown)', 'err');
            reset();
        });

    }

    var displayUpdate = function (data) {
        $('#last_weight').val(data.weight + ' ' + data.w_uom);
        $('#card_in_1,#card_in_2,#card_workstation,#last_weight,#last_quality').addClass('success');
        info('Weight saved successfully', 'ok')
        window.setTimeout(function () {
                $('#card_in_1,#card_in_2,#card_workstation,#last_weight,#last_quality').removeClass('success');
            },
            3000
        );
    }

    var reset = function () {
        cards_in = [];
        card_workstation = null;
        $('#quality_select').val($('#initial_quality_id').val()).change();
        if ( isOneInput() )  switch_enabled($('#one_input_button'), false);
    }

    var check_reset_screen = function () {
        if ( inputCount() === 0  && (card_workstation === null) ) {
            $('#lot').html('');
            $('#card_in_1,#card_in_2,#card_workstation,#last_weight,#last_quality').val('');
        }
    }

    return {
        addCard: addCard,
        updateQuality: updateQuality
    }

}/*)()*/;

ws_event_received = function (event) {

    try {
        console.log('Event received:');
        console.log(event.data);

        var obj = JSON.parse(event.data);

        if ( !(obj.Event && obj.Event.device_id && obj.Event.user_id) ) {
            console.log('Event not recognized');
            return;
        }

        console.log('Device: ' + obj.Event.device_id.id);
        console.log('Card/User: ' + obj.Event.user_id.user_id);

        if ( $('#rfid_reader_code').val() === obj.Event.device_id.id ) {
            console.log('Matched!');
            show_info('Read card #' + obj.Event.user_id.user_id, 'ok');
            read_card_manage(obj.Event.user_id.user_id);
        }
        else {
            console.log('Skipped');
        }

    }
    catch (e) {
        show_info('ERROR: ' + e.message, 'err');
    }

}

read_card_manage = function (card_code) {

    $.ajax({
        url: '/mdc/cp/carddata/' + card_code,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({})
    }).done(function (data) {
        try {
            console.log(data.result);
            if ( data.result.err ) {
                throw new Error('ERROR retrieving card data: ' + data.result.err);
            }
            else {
                woutState.addCard(data.result);
                return;
            }
        }
        catch (e) {
            show_info(e.message, 'err');
            // TODO additional stuff over display
        }
    }).fail(function () {
        show_info('ERROR retrieving card data (unknown)', 'err');
    });

}

var woutState = null;

$(document).ready(function() {

    /* var ws = */ws_create(ws_event_received);
    show_info('Ready for card readings!!!', 'ok');

    // TODO additional initial stuff

    // Button events
    $('#one_input_button,#crumbs_button,#shared_button').click(function () {
        switch_enabled(this, true);
    });

    /*$('#one_input_button').click(function () {
        one_input_validation(this);
    });*/

    woutState = WoutState();

    $('#quality_select')
        .change(woutState.updateQuality)
        .val($('#initial_quality_id').val())
        .change();

});

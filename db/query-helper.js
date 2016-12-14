'use strict';

let _ = require('underscore');
let mysql = require('mysql');


let querySubString = function(values, deliminator, terminator, shouldEscape) {
    let subQuery = '';
    let counter = 0;
    if (_.isArray(values)) {
        _.each(values, function(value) {
            subQuery += '`' + (shouldEscape ? mysql.escape(value) : value) + '`' +
                (counter === values.length - 1 ? terminator : deliminator);
            counter++;
        });
    } else {
        _.each(values, function(value, key) {
            subQuery += '`' + key + '`=' + mysql.escape(value) +
                + (counter === values.length - 1 ? terminator : deliminator);
            counter++;
        });
    }

    return subQuery;
};

let valuesQuerySubString = function(values, deliminator, terminator) {
    let query = '';
    let counter = 0;
    _.each(values, function(value) {
        if(_.isArray(value)) {
            query = valuesQuerySubString(value, deliminator, terminator)
                + (counter === values.length - 1 ? '' : ',');
        } else {
            query += mysql.escape(value) + (counter === values.length - 1 ? terminator : deliminator);
        }

        counter++;
    });

    return query;
};

let whereEqualQuery = function(columnsAndValues, deliminator) {
    let query = '';
    let counter = 0;
    let length = _.keys(columnsAndValues).length;
    _.each(columnsAndValues, function(value, column) {
        query += '`' + column + '`' + '=' + mysql.escape(value) + (counter === length - 1 ? '' : deliminator);
        counter++;
    });

    return query;
};

let addBackTick = function(value) {
    return '`' + value + '`';
};

module.exports = {
    /**
     * Select query where comparison is done by unique columns and values.
     *
     * @param {string} table Name of table to select from
     * @param {array} columnsToSelect Columns to select
     * @param {object} comparisonColumnsAndValues Values and column
     *     names to filter query by
     * @returns {string}
     */
    selectWithAnd: function(table, columnsToSelect, comparisonColumnsAndValues) {
        let query = 'SELECT ';
        query += (!columnsToSelect || columnsToSelect.length === 0) ? '* ' :
            querySubString(columnsToSelect, ',', ' ', false);
        query += 'FROM `' + table + '`';

        if (comparisonColumnsAndValues) {
            query += ' WHERE ' + whereEqualQuery(comparisonColumnsAndValues, ' AND ');
        }

        return query;
    },

    /**
     * Select query where comparison is done by a single column name
     * that can have multiple values
     *
     * @param {string} table Name of table to select from
     * @param {array} columnsToSelect Columns to select
     * @param {string} columnNameToCompare Name of the column to be used
     *    in the comparison
     * @param {array} columnTargetValues Values to be used in comparison
     *     with columnNameToCompare
     * @returns {string}
     */
    selectWithOr: function(table, columnsToSelect, columnNameToCompare, columnTargetValues) {
        let query = 'SELECT ';
        query += (!columnsToSelect || columnsToSelect.length === 0) ? '* ' :
            querySubString(columnsToSelect, ',', ' ', false);
        query += 'FROM `' + table + '`';

        if (columnNameToCompare && columnTargetValues) {
            let counter = 0;
            query += ' WHERE ';
            _.each(columnTargetValues, function(targetValue) {
                query += '`' + columnNameToCompare + '`=' + mysql.escape(targetValue) +
                    (counter === columnTargetValues.length - 1 ? '' : ' OR ');
                counter++;
            });
        }

        return query;
    },

    /*
     * @param {String} Name of table to insert into
     * @param {object} Columns and Values to insert
     *
     * @return {String} Insert query
     */
    insertSingle: function(table, columnsAndValues) {
        let columns = _.keys(columnsAndValues);
        let values = [];
        _.each(columns, function(column) {
            values.push(columnsAndValues[column]);
        });

        return 'INSERT INTO `' + table + '`(' + querySubString(columns, ',', ')', false) +
            ' VALUES (' + valuesQuerySubString(values, ',', '') + ')';
    },

    /*
     * @param {String} Name of table to insert into
     * @param {Array} Names of columns to insert
     * @param {Array} Array of arrays. Each sub-array holds
     * the column values of one of the insert objects
     *
     * @return {String} Insert query
     */
    insertMultiple: function(table, columns, values) {
        let query = 'INSERT INTO `' + table + '`(' + querySubString(columns, ',', ')', false) + ' VALUES ';
        let counter = 0;
        _.each (values, function(subValue) {
            query += '(' + valuesQuerySubString(subValue, ',', '') + ')' +
                (counter === values.length - 1 ? '' : ',');
            counter++;
        });

        return query;
    },

    /**
     * Updates a single record
     *
     * @param {string} table Table to update
     * @param {Object} columnsAndValues Columns and values to update
     * @param {string} targetColumn Column to identify the update record
     * @param {string} targetValue Value to identify the update record
     *
     * @returns {string}
     */
    updateSingle: function(table, columnsAndValues, targetColumn, targetValue) {
        let columns = _.keys(columnsAndValues);
        let values = [];
        _.each(columns, function(column) {
            values.push(columnsAndValues[column]);
        });

        return 'UPDATE `' + table + '` SET ' + whereEqualQuery(columnsAndValues, ',') +
            ' WHERE `' + targetColumn + '`=' + mysql.escape(targetValue)
    },

    /**
     * Create a query string for a join statement
     *
     * @param {string} table1 Name of the first table to join
     * @param {string} table2 Name of the second table to join
     * @param {array} table1ColumnsToSelect Names of the colums for the select statement
     * @param {string} comparisonColumn Column name to run the comparison on
     *
     * @returns {string}
     */
    join: function(table1, table2, table1ColumnsToSelect, comparisonColumn) {
        return this.selectWithAnd(table1, table1ColumnsToSelect, null) + ' JOIN `' + table2 + '` ON `'
            + table1 + '`.`' + comparisonColumn + '`=`' + table2 + '`.`' + comparisonColumn + '`';
    },

    /**
     * Creates a join statement with a where clause for a single
     * column in a table.
     *
     * @param {string} table1 Name of the first table to join
     * @param {string} table2 Name of the second table to join
     * @param {array} table1ColumnsToSelect Names of the colums for the select statement
     * @param {string} comparisonColumn Column name to run the comparison on
     * @param {string} filterColumn Column to filter with in where clause
     * @param {array} filterValues Values for filtering in where clause
     * @returns {string}
     */
    joinWithOr: function(table1, table2, table1ColumnsToSelect, comparisonColumn, filterColumn, filterValues) {
        let counter = 0;
        let equalClause = addBackTick(table1) + '.' + addBackTick(filterColumn) + '=';
        let query = this.join(table1, table2, table1ColumnsToSelect, comparisonColumn) + ' WHERE ';
        _.each(filterValues, function(filterValue) {
            query += equalClause + mysql.escape(filterValue) +
                (counter === filterValues.length - 1 ? '' : ' OR ');
            counter++;
        });

        return query;
    }
};

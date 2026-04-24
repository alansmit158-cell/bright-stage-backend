/**
 * Calcule la contribution patronale pour un employé diplômé recruté en 2026,
 * selon l'Article 13 de la Loi de Finances.
 * 
 * @param {Date|String} dateRecrutement - Date de recrutement
 * @param {Number} salaireBrut - Salaire Brut
 * @param {Number} tauxStandardPatronal - Taux standard (ex: 16.57% pour la CNSS en Tunisie)
 * @returns {Object} { employerContribution, exemptionRate, yearOfService }
 */
const calculateEmployerContribution2026 = (dateRecrutement, salaireBrut, tauxStandardPatronal = 0.1657) => {
    const startDate = new Date(dateRecrutement);
    const now = new Date();

    // Check if recruitment is in 2026 or later as per Article 13
    if (startDate < new Date('2026-01-01')) {
        return {
            employerContribution: salaireBrut * tauxStandardPatronal,
            exemptionRate: 0,
            yearOfService: 0,
            note: "Article 13 only applies to recruitments from Jan 1st, 2026."
        };
    }

    // Calculate years of seniority
    let yearsOfSeniority = now.getFullYear() - startDate.getFullYear();
    const monthDiff = now.getMonth() - startDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < startDate.getDate())) {
        yearsOfSeniority--;
    }

    // Article 13 Barème Dégressif:
    // Année 1 (0-11 mois): 100% exonération
    // Année 2: 80%
    // Année 3: 60%
    // Année 4: 40%
    // Année 5: 20%

    let exemptionRate = 0;
    const yearOfService = yearsOfSeniority + 1; // 1st year, 2nd year, etc.

    if (yearOfService === 1) exemptionRate = 1.0;
    else if (yearOfService === 2) exemptionRate = 0.8;
    else if (yearOfService === 3) exemptionRate = 0.6;
    else if (yearOfService === 4) exemptionRate = 0.4;
    else if (yearOfService === 5) exemptionRate = 0.2;
    else exemptionRate = 0;

    const standardContribution = salaireBrut * tauxStandardPatronal;
    const finalContribution = standardContribution * (1 - exemptionRate);

    return {
        standardContribution,
        finalContribution,
        exemptionAmount: standardContribution * exemptionRate,
        exemptionRate: (exemptionRate * 100).toFixed(0) + "%",
        yearOfService
    };
};

module.exports = { calculateEmployerContribution2026 };

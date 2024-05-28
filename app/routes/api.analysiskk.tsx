import { json, redirect } from "@remix-run/node";
import { prisma } from "~/utils/prisma.server";
import { getAuthFromRequest } from "~/utils/auth";

let NDONE = 1;
let ITMAX = 20;
let ndat = 0;
let ma = 0;
let mfit = 0;
let x = [];
let y = [];
let sig = [];
let ia = [];
let xi = 0;
let ochisq = 0;
let gridType = 2;
let lamdaInit = 0.1;
let tol = 0.1;
let lamdaHigh = 100;
let lamdaLow = 0.001;
let temp = [[]];
let oneda = [[]];
let beta = [];
let a = [];
let covar = [[]];
let alpha = [[]];
let chisq = 0;
let ymod = 0;
let wt = 0;
let sig2i = 0;
let dy = 0;
let newAtry = [];
let newA = [];
let newBeta = [];
let dyda = [];
let atry = [];
let da = [];
let malla = [];
let w = [];
let delta = [];
let triangularModel = [];

function g(x, y) {
  return (x + y) * Math.log10(Math.abs(x + y)) + (x - y) * Math.log10(Math.abs(x - y));
}

async function fit(userId) {
  let j = 0;
  let k = 0;
  let l = 0;
  let iter = 0;
  let done = 0;
  let alamda = lamdaInit;
  let atry = [];
  let beta = [];
  let da = [];

  for (j = 0; j < ma; j++) {
    if (!atry[j]) {
      atry[j] = 1;
    }
    if (!beta[j]) {
      beta[j] = 0;
    }
    if (!da[j]) {
      da[j] = 0;
    }
  }

  mfit = 0;

  for (j = 0; j < ma; j++) {
    if (ia[j]) {
      mfit++;
    }
  }

  for (j = 0; j < mfit; j++) {
    if (!oneda[j]) {
      oneda[j] = [];
    }

    if (!temp[j]) {
      temp[j] = [];
    }

    for (let k = 0; k <= 1; k++) {
      oneda[j][k] = 0;
    }

    for (let k = 0; k <= j; k++) {
      temp[j][k] = 0;
    }
  }

  for (j = 0; j < ma; j++) {
    if (!alpha[j]) {
      alpha[j] = [];
    }
    if (!covar[j]) {
      covar[j] = [];
    }

    for (let k = 0; k <= j; k++) {
      alpha[j][k] = 0;
    }

    for (let k = 0; k <= j; k++) {
      covar[j][k] = 0;
    }
  }

  newA = [...a];

  await mrqconf1();
  beta = [...newBeta];
  for (j = 0; j < ma; j++) {
    atry[j] = a[j];
  }

  ochisq = chisq;

  for (iter = 0; iter < ITMAX; iter++) {
    if (done === NDONE) {
      alamda = 0.0;
    }

    for (let j = 0; j < mfit; j++) {
      for (let k = 0; k < mfit; k++) {
        covar[j][k] = alpha[j][k];
      }

      covar[j][j] = alpha[j][j] * (1.0 + alamda);

      for (k = 0; k < mfit; k++) {
        temp[j][k] = covar[j][k];
      }

      oneda[j][0] = beta[j];
    }

    try {
      gaussj(temp, oneda, mfit);
    } catch (error) {
      console.error("Error in gaussj:", error);
      return { error: "Singular matrix encountered in gaussj." };
    }

    for (let j = 0; j < mfit; j++) {
      for (let k = 0; k < mfit; k++) {
        covar[j][k] = temp[j][k];
      }
      da[j] = oneda[j][0];
    }

    if (done === NDONE) {
      await covsrtCovar();
      await covsrtAlpha();
      break;
    }

    let j = 0;
    for (let l = 0; l < ma; l++) {
      if (ia[l]) {
        atry[l] = a[l] + da[j++];
      }
    }

    newAtry = [...atry];
    await mrqconf2();

    if (Math.abs(chisq - ochisq) < Math.max(tol, tol * chisq)) {
      done++;
    }

    if (chisq < ochisq) {
      alamda *= lamdaLow;
      ochisq = chisq;

      for (j = 0; j < mfit; j++) {
        for (k = 0; k < mfit; k++) {
          alpha[j][k] = covar[j][k];
        }
        beta[j] = da[j];
      }
      for (l = 0; l < ma; l++) {
        a[l] = atry[l];
      }
    } else {
      alamda *= lamdaHigh;
      chisq = ochisq;
    }
  }

  let evarepsilon1 = [];
  let evarepsilon1Y = [];
  let evarepsilon2Y = [];

  for (let i = 1; i < w.length - 1; i++) {
    evarepsilon1[i - 1] = (1 / Math.PI) * (g(malla[i - 1], w[i - 1]) / (w[i] - w[i - 1]) -
      (((w[i + 1] - w[i - 1]) * g(malla[i - 1], w[i])) / ((w[i] - w[i - 1]) * (w[i + 1] - w[i]))) +
      g(malla[i - 1], w[i + 1]) / (w[i + 1] - w[i]));
  }

  for (let i = 1; i < a.length - 1; i++) {
    evarepsilon1Y[i - 1] = a[i] * evarepsilon1[i - 1];
  }

  for (let i = 1; i < a.length - 1; i++) {
    evarepsilon2Y[i - 1] = a[i] * triangularModel[i - 1];
  }

  let evarX = [];

  for (let i = 1; i < a.length - 1; i++) {
    evarX[i - 1] = malla[i - 1];
  }

  await covsrtCovar();
  await covsrtAlpha();

  let realPartYC = [...evarepsilon1Y];
  let imaginaryPartYC = [...evarepsilon2Y];
  let imaginaryPartYA = [...x];
  let newAlpha = [...alpha];
  let newDelta = 0;
  let change = 0;

  for (let j = 0; j < a.length - 2; j++) {
    for (let i = -1; i < 0; i = imaginaryPartYC[j] - imaginaryPartYA[j]) {
      newDelta = Math.sqrt(0.0000000000000001 * newAlpha[j][j]);
      change += newDelta;

      imaginaryPartYC[j] = change + imaginaryPartYC[j];
    }
    realPartYC[j] = change + realPartYC[j];
    change = 0;
  }

  let diff = [];
  for (let i = 1; i < a.length - 1; i++) {
    diff[i - 1] = (imaginaryPartYC[i - 1] - imaginaryPartYA[i - 1]) * 100;
  }

  // Verifica si el usuario existe antes de crear el resultado del análisis
  const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
  if (!user) {
    console.error(`User with ID ${userId} not found.`);
    return { error: `User with ID ${userId} not found.` };
  }

  // Verificar los valores calculados antes de guardar
  console.log("realPartYC:", realPartYC);

  const savedResult = await prisma.analysisResult.create({
    data: {
      userId: parseInt(userId),
      chisq: chisq,
      lamdaLow: lamdaLow,
      lamdaHigh: lamdaHigh,
      lamdaInit: lamdaInit,
      deltachi: 0,
      tolerance: tol,
      params: JSON.stringify(a),
      alpha: JSON.stringify(alpha),
      difference: JSON.stringify(diff),
      dfRealPartX: JSON.stringify(evarX),
      dfRealPartY: JSON.stringify(realPartYC),
      dfImaginaryPartX: JSON.stringify(evarX),
      dfImaginaryPartY: JSON.stringify(imaginaryPartYC),
      imaginaryPartX: JSON.stringify(w),
      imaginaryPartY: JSON.stringify(x),
    },
  });

  return savedResult;
}

function funcs1(xy) {
  ymod = 0;
  let na = newA.length;

  for (let i = 0; i < na; i++) {
    ymod += newA[i] * xy;
    dyda[i] = x[i];
  }
}

function covsrtAlpha() {
  var k;
  for (let i = mfit; i < ma; i++) {
    for (let j = 0; i + 1 > j; j++) {
      alpha[i][j] = alpha[j][i] = 0;
    }
  }
  k = mfit - 1;
  for (let j = ma - 1; 0 <= j; j--) {
    if (ia[j]) {
      for (let i = 0; ma > i; i++) {
        let swap = alpha[i][j];
        alpha[i][j] = alpha[i][k];
        alpha[i][k] = swap;
      }

      for (let i = 0; ma > i; i++) {
        let swap = alpha[j][i];
        alpha[j][i] = alpha[k][i];
        alpha[k][i] = swap;
      }
      k--;
    }
  }
}

async function mrqconf1() {
  let dy = 0;
  let wt = 0;

  sig2i = 1;

  for (let j = 0; j < ma; j++) {
    if (!dyda[j]) {
      dyda[j] = 1;
    }
  }

  for (let j = 0; j < mfit; j++) {
    if (!alpha[j]) {
      alpha[j] = [];
    }

    for (let k = 0; k <= j; k++) {
      alpha[j][k] = 0;
    }
    beta[j] = 0;
  }

  chisq = 0;

  for (let i = 0; i < ndat; i++) {
    xi = x[i];
    funcs1(xi);
    sig2i = 1.0 / (sig[i] * sig[i]);

    dy = y[i] - ymod;

    let j = 0;
    for (let l = 0; l < ma; l++) {
      if (ia[l]) {
        wt = dyda[l] * sig2i;

        let k = 0;
        for (let m = 0; m < l + 1; m++) {
          if (ia[m]) {
            alpha[j][k++] += wt * dyda[m];
          }
        }
        beta[j++] += dy * wt;
      }
    }
    chisq += dy * dy * sig2i;
  }

  newBeta = [...beta];
  for (let j = 1; j < mfit; j++) {
    for (let k = 0; j > k; k++) {
      alpha[k][j] = alpha[j][k];
    }
  }
}

async function mrqconf2() {
  let dy = 0;
  let wt = 0;
  for (let j = 0; j < ma; j++) {
    dyda[j] = 1;
  }

  for (let j = 0; j < ma; j++) {
    if (!covar[j]) {
      covar[j] = [];
    }

    for (let k = 0; k <= j; k++) {
      covar[j][k] = 0;
    }

    da[j] = 0;
  }

  chisq = 0;

  for (let i = 0; ndat > i; i++) {
    xi = x[i];

    await funcs2(xi);

    sig2i = 1.0 / (sig[i] * sig[i]);
    dy = y[i] - ymod;

    let j = 0;
    for (let l = 0; ma > l; l++) {
      if (ia[l]) {
        wt = dyda[l] * sig2i;

        let k = 0;
        for (let m = 0; l + 1 > m; m++) {
          if (ia[m]) {
            covar[j][k] = covar[j][k] + wt * dyda[m];
            k++;
          }
        }
        da[j] = da[j] + dy * wt;

        j++;
      }
    }

    chisq += dy * dy * sig2i;
  }

  for (let j = 1; mfit > j; j++) {
    for (let k = 0; j > k; k++) {
      covar[k][j] = covar[j][k];
    }
  }
}

function funcs2(xy) {
  ymod = 0;

  for (let i = 0; newAtry.length > i; i++) {
    ymod += newAtry[i] * xy;

    dyda[i] = x[i];
  }
}

function hold(i, val) {
  ia[i] = false;
  a[i] = val;
}

function free(i) {
  ia[i] = true;
}

function covsrtCovar() {
  let i, j, k;
  for (i = mfit; ma > i; i++) {
    for (let j = 0; i + 1 > j; j++) {
      covar[i][j] = covar[j][i] = 0.0;
    }
  }
  k = mfit - 1;
  for (j = ma - 1; 0 <= j; j--) {
    if (ia[j]) {
      for (let i = 0; ma > i; i++) {
        let swap = covar[i][j];
        covar[i][j] = covar[i][k];
        covar[i][k] = swap;
      }

      for (let i = 0; ma > i; i++) {
        let swap = covar[j][i];
        covar[j][i] = covar[k][i];
        covar[k][i] = swap;
      }
      k--;
    }
  }
}

function gaussj(a, b, n) {
  let ipiv = Array(n).fill(0);
  let indxr = Array(n).fill(0);
  let indxc = Array(n).fill(0);

  for (let i = 0; n > i; i++) {
    let big = 0.0;
    let irow = -1;
    let icol = -1;

    for (let j = 0; n > j; j++) {
      if (ipiv[j] !== 1) {
        for (let k = 0; n > k; k++) {
          if (ipiv[k] === 0) {
            if (Math.abs(a[j][k]) >= big) {
              big = Math.abs(a[j][k]);
              irow = j;
              icol = k;
            }
          }
        }
      }
    }

    ++(ipiv[icol]);

    if (irow !== icol) {
      for (let l = 0; l < n; l++) {
        let temp = a[irow][l];
        a[irow][l] = a[icol][l];
        a[icol][l] = temp;
      }
      for (let l = 0; 1 > l; l++) {
        let temp = b[irow][l];
        b[irow][l] = b[icol][l];
        b[icol][l] = temp;
      }
    }

    indxr[i] = irow;
    indxc[i] = icol;

    if (a[icol][icol] === 0) {
      console.log("Singular Matrix Detected:");
      console.log("a:", a);
      console.log("irow:", irow, "icol:", icol);
      throw new Error("gaussj: Singular Matrix");
    }

    let pivinv = 1.0 / a[icol][icol];
    a[icol][icol] = 1.0;
    for (let l = 0; l < n; l++) a[icol][l] *= pivinv;
    for (let l = 0; l < 1; l++) b[icol][l] *= pivinv;

    for (let ll = 0; n > ll; ll++) {
      if (ll !== icol) {
        let dum = a[ll][icol];
        a[ll][icol] = 0.0;
        for (let l = 0; l < n; l++) a[ll][l] -= a[icol][l] * dum;
        for (let l = 0; l < 1; l++) b[ll][l] -= b[icol][l] * dum;
      }
    }
  }

  for (let l = n - 1; 0 <= l; l--) {
    if (indxr[l] !== indxc[l]) {
      for (let k = 0; n > k; k++) {
        let temp = a[k][indxr[l]];
        a[k][indxr[l]] = a[k][indxc[l]];
        a[k][indxc[l]] = temp;
      }
    }
  }
}

export async function action({ request }) {
  const userId = await getAuthFromRequest(request);
  const params = await request.json();
  console.log("Received parameters:", params);

  // Asignación de valores por defecto y logs
  lamdaInit = params.lamdaInit || 0.1;
  lamdaHigh = params.lamdaHigh || 10;
  lamdaLow = params.lamdaLow || 0.001;
  tol = params.tol || 0.01;
  ITMAX = params.iterMax || 5;
  NDONE = params.NDone || 1;

  if (params.partX && params.partY) {
    ma = params.partY.length;
    x = [...params.partY];
    w = [...params.partX];
    ndat = params.partY.length;
  }

  gridType = params.gridType !== undefined ? params.gridType : 2;

  for (let i = 1; i < ndat - 1; i++) {
    switch (gridType) {
      case 1:
        malla[i - 1] = (w[i + 1] + w[i - 1]) / 2;
        break;
      case 2:
        malla[i - 1] = ((w[i + 1] - w[i - 1]) / 2) + w[i - 1];
        break;
      case 3:
        malla[i - 1] = ((w[i] - w[i - 1]) / 2) + w[i - 1];
        break;
      case 4:
        malla[i - 1] = (w[i] + w[i - 1]) / 2;
        break;
      default:
        malla[i - 1] = (w[i] + w[i - 1]) / 2;
        break;
    }

    if (w[i - 1] < malla[i - 1] && malla[i - 1] <= w[i]) {
      triangularModel[i - 1] = (malla[i - 1] - w[i - 1]) / (w[i] - w[i - 1]);
    } else if (w[i] < malla[i - 1] && malla[i - 1] < w[i + 1]) {
      triangularModel[i - 1] = (w[i + 1] - malla[i - 1]) / (w[i + 1] - w[i]);
    } else {
      triangularModel[i - 1] = 0.0;
    }
  }

  y = [...triangularModel];
  ndat = y.length;

  if (params.a !== undefined) {
    a = [...params.a];
  } else {
    for (let i = 0; i < ma; i++) {
      a[i] = 1;
    }
  }

  for (let i = 0; i < ma; i++) {
    ia[i] = true;
  }

  for (let i = 0; i < ma; i++) {
    sig[i] = 1;
  }

  const savedResult = await fit(userId);

  if (savedResult && savedResult.id) {
    console.log("Saved result:", savedResult);
    return json({ id: savedResult.id });
  } else {
    console.error("Failed to save the result or missing result ID.");
    return json({ error: "Failed to save the result or missing result ID." }, { status: 500 });
  }
}

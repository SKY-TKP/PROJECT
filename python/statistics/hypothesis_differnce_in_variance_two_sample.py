import matplotlib.pyplot as plt
from scipy.stats import f

def plot_f_test_rejection_region(variance1, variance2, n1, n2, alpha, test_type):
  """
  Plots the F-distribution with rejection region for a hypothesis test of the ratio of two variances.

  Args:
    variance1: The sample variance of the first group.
    variance2: The sample variance of the second group.
    n1: The sample size of the first group.
    n2: The sample size of the second group.
    alpha: The significance level.
    test_type: The type of test ('left', 'right', 'two').
  """

  df1 = n1 - 1  # Degrees of freedom for the first group
  df2 = n2 - 1  # Degrees of freedom for the second group

  # Calculate the F-statistic
  f_statistic = variance1 / variance2

  # Generate x-axis values for the F-distribution
  x = np.linspace(0, f.ppf(0.999, df1, df2) + 5, 500)

  y = f.pdf(x, df1, df2)
  plt.plot(x, y, label='F-Distribution')

  if test_type == 'left':
    critical_value = f.ppf(alpha, df1, df2)
    x_rejection = np.linspace(0, critical_value, 100)
    y_rejection = f.pdf(x_rejection, df1, df2)
    plt.fill_between(x_rejection, y_rejection, 0, color='red', alpha=0.3, label='Rejection Region')
    plt.title('F-Distribution with Rejection Region (Left-Tailed)')

  elif test_type == 'right':
    critical_value = f.ppf(1 - alpha, df1, df2)
    x_rejection = np.linspace(critical_value, f.ppf(0.999, df1, df2) + 5, 100)
    y_rejection = f.pdf(x_rejection, df1, df2)
    plt.fill_between(x_rejection, y_rejection, 0, color='red', alpha=0.3, label='Rejection Region')
    plt.title('F-Distribution with Rejection Region (Right-Tailed)')

  elif test_type == 'two':
    critical_value_lower = f.ppf(alpha / 2, df1, df2)
    critical_value_upper = f.ppf(1 - alpha / 2, df1, df2)
    x_rejection_left = np.linspace(0, critical_value_lower, 100)
    y_rejection_left = f.pdf(x_rejection_left, df1, df2)
    plt.fill_between(x_rejection_left, y_rejection_left, 0, color='red', alpha=0.3, label='Rejection Region')
    x_rejection_right = np.linspace(critical_value_upper, f.ppf(0.999, df1, df2) + 5, 100)
    y_rejection_right = f.pdf(x_rejection_right, df1, df2)
    plt.fill_between(x_rejection_right, y_rejection_right, 0, color='red', alpha=0.3)
    plt.title('F-Distribution with Rejection Region (Two-Tailed)')

  else:
    print("Invalid test type. Please choose 'left', 'right', or 'two'.")
    return

  plt.axvline(f_statistic, color='blue', linestyle='--', label='Calculated F-statistic')

  if test_type == 'left' or test_type == 'right':
    plt.axvline(critical_value, color='green', linestyle='--', label='Critical F-value')

  elif test_type == 'two':
    plt.axvline(critical_value_lower, color='green', linestyle='--', label='Critical F-values')
    plt.axvline(critical_value_upper, color='green', linestyle='--')


  plt.xlabel('F-statistic')
  plt.ylabel('Probability Density')
  plt.legend()
  plt.show()

  print(f"Calculated F-statistic: {f_statistic}")

  if test_type == 'left' or test_type == 'right':
    print(f"Critical F-value: {critical_value}")

  elif test_type == 'two':
    print(f"Critical F-values: {critical_value_lower}, {critical_value_upper}")

  # Calculate the p-value
  if test_type == 'left':
    p_value = f.cdf(f_statistic, df1, df2)
  elif test_type == 'right':
    p_value = 1 - f.cdf(f_statistic, df1, df2)
  elif test_type == 'two':
    if f_statistic < critical_value_lower:
      p_value = 2 * f.cdf(f_statistic, df1, df2)
    else:
      p_value = 2 * (1 - f.cdf(f_statistic, df1, df2))
  else:
    print("Invalid test type. Please choose 'left', 'right', or 'two'.")
    return

  print(f"P-value: {p_value}")

  if p_value < alpha:
    print("Reject the null hypothesis.")
  else:
    print("Fail to reject the null hypothesis.")

  return f_statistic, p_value


# Example usage
f_statistic, p_value = plot_f_test_rejection_region(variance1=30, variance2=20, n1=20, n2=20, alpha=0.05, test_type='right')

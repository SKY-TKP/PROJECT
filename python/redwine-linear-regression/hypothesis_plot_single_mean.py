import matplotlib.pyplot as plt
import numpy as np
def plot_hypothesis_test(mu_0, xbar, sd, n, alpha, test_type, distribution='normal'):
  """
  Plots the standard normal or t-distribution with rejection region for a hypothesis test.

  Args:
    mu_0: The null hypothesis mean.
    xbar: The sample mean.
    sd: The population or sample standard deviation.
    n: The sample size.
    alpha: The significance level.
    test_type: The type of test ('left', 'right', 'two').
    distribution: The type of distribution ('normal', 't').
  """
  print(f'Test type: {test_type}')
  print(f'Distribution: {distribution}\n')

  if distribution == 'normal':
    se = sd / np.sqrt(n)
    z = (xbar - mu_0) / se
    dist = norm
    x = np.linspace(-4, 4, 500)
    critical_value_label = 'Critical z-value'
    title_prefix = 'Standard Normal'

  elif distribution == 't':
    se = sd / np.sqrt(n)
    t_statistic = (xbar - mu_0) / se
    df = n - 1  # Degrees of freedom
    dist = t
    x = np.linspace(-4, 4, 500)
    critical_value_label = 'Critical t-value'
    title_prefix = 'T-student'

    # Calculate the p-value
    if test_type == 'left':
      p_value = dist.cdf(t_statistic, df)
    elif test_type == 'right':
      p_value = 1 - dist.cdf(t_statistic, df)
    elif test_type == 'two':
      p_value = 2 * (1 - dist.cdf(abs(t_statistic), df))
    else:
      print("Invalid test type. Please choose 'left', 'right', or 'two'.")
      return

  else:
    print("Invalid distribution type. Please choose 'normal' or 't'.")
    return

  y = dist.pdf(x, df) if distribution == 't' else dist.pdf(x)
  plt.plot(x, y, label='{} Distribution'.format(title_prefix))

  if test_type == 'left':
    critical_value = dist.ppf(alpha, df) if distribution == 't' else dist.ppf(alpha)
    x_rejection = np.linspace(-4, critical_value, 100)
    y_rejection = dist.pdf(x_rejection, df) if distribution == 't' else dist.pdf(x_rejection)
    plt.fill_between(x_rejection, y_rejection, 0, color='red', alpha=0.3, label='Rejection Region')
    plt.title('{} Distribution with Rejection Region (Left-Tailed)'.format(title_prefix))
  elif test_type == 'right':
    critical_value = dist.ppf(1 - alpha, df) if distribution == 't' else dist.ppf(1 - alpha)
    x_rejection = np.linspace(critical_value, 4, 100)
    y_rejection = dist.pdf(x_rejection, df) if distribution == 't' else dist.pdf(x_rejection)
    plt.fill_between(x_rejection, y_rejection, 0, color='red', alpha=0.3, label='Rejection Region')
    plt.title('{} Distribution with Rejection Region (Right-Tailed)'.format(title_prefix))
  elif test_type == 'two':
    critical_value = dist.ppf(1 - alpha / 2, df) if distribution == 't' else dist.ppf(1 - alpha / 2)
    x_rejection_left = np.linspace(-4, -critical_value, 100)
    y_rejection_left = dist.pdf(x_rejection_left, df) if distribution == 't' else dist.pdf(x_rejection_left)
    plt.fill_between(x_rejection_left, y_rejection_left, 0, color='red', alpha=0.3, label='Rejection Region')
    x_rejection_right = np.linspace(critical_value, 4, 100)
    y_rejection_right = dist.pdf(x_rejection_right, df) if distribution == 't' else dist.pdf(x_rejection_right)
    plt.fill_between(x_rejection_right, y_rejection_right, 0, color='red', alpha=0.3)
    plt.title('{} Distribution with Rejection Region (Two-Tailed)'.format(title_prefix))
  else:
    print("Invalid test type. Please choose 'left', 'right', or 'two'.")
    return


  if distribution == 't':
    plt.axvline(t_statistic, color='blue', linestyle='--', label='Calculated t-statistic')
    if test_type == 'left' or test_type == 'right':
      plt.axvline(critical_value, color='green', linestyle='--', label=critical_value_label)
    elif test_type == 'two':
      plt.axvline(-critical_value, color='green', linestyle='--', label=critical_value_label)
      plt.axvline(critical_value, color='green', linestyle='--')

    print(f"Calculated t-statistic: {t_statistic}")
    print(f"P-value: {p_value}")

    if test_type == 'left' or test_type == 'right':
      print(f"{critical_value_label}: {critical_value}")
    elif test_type == 'two':
      print(f"{critical_value_label}: {-critical_value}, {critical_value}")

    if p_value < alpha:
      print("Reject the null hypothesis.")
    else:
      print("Fail to reject the null hypothesis.")
  else:
    plt.axvline(z, color='blue', linestyle='--', label='Calculated z-score')

    if test_type == 'left' or test_type == 'right':
      plt.axvline(critical_value, color='green', linestyle='--', label=critical_value_label)
    elif test_type == 'two':
      plt.axvline(-critical_value, color='green', linestyle='--', label=critical_value_label)
      plt.axvline(critical_value, color='green', linestyle='--')

    plt.xlabel('z-score' if distribution == 'normal' else 't-statistic')
    plt.ylabel('Probability Density')
    plt.legend()
    plt.show()

    print(f"Calculated z-score: {z}")
    if test_type == 'left' or test_type == 'right':
      print(f"Critical z-value: {critical_value}")
    elif test_type == 'two':
      print(f"Critical z-values: {-critical_value}, {critical_value}")

  print("#-----------------------------------------------")


# Example usage (with unknown population variance):
plot_hypothesis_test(mu_0=650, xbar=655, sd=25, n=25, alpha=0.05, test_type='right', distribution='t')


# data = np.array([105.6, 90.9, 91.2, 96.9, 96.5, 91.3, 100.1, 105.0, 99.6, 107.7, 103.3, 92.4])

# plot_hypothesis_test(mu_0=100, xbar=np.mean(data), sd=np.std(data), n=12, alpha=0.05, test_type='two', distribution='t')
# plot_hypothesis_test(mu_0=500, xbar=452,  sd=112.5, n=20,  alpha=0.05, test_type='left', distribution='t')
